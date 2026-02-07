import { getDriver } from './db';
import fs from 'fs';
import iconv from 'iconv-lite';

interface QuizItem {
    question: string;
    options: string[];
    answer: string;
    wordId: string;
    type: 'definition' | 'synonym' | 'example';
}

interface VocabEntry {
    word: string;
    pos: string;
    koreanDef: string;
    englishDef: string;
    example: string;
    cefr: string;
}

// Cache for vocabulary data
let vocabCache: VocabEntry[] | null = null;

// Parse CSV content handling multiline quoted fields
const parseCSV = (content: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            currentRow.push(currentField);
            if (currentRow.length > 1 || currentRow[0]) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
            if (char === '\r') i++; // Skip \n in \r\n
        } else if (char !== '\r') {
            currentField += char;
        }
    }

    // Handle last field and row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 1 || currentRow[0]) {
            rows.push(currentRow);
        }
    }

    return rows;
};

const loadVocabularyData = (): VocabEntry[] => {
    if (vocabCache) return vocabCache;

    const csvPath = "c:\\irt_vocab9000_google\\public\\master_vocabulary_table9000.csv";

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        return [];
    }

    try {
        const buffer = fs.readFileSync(csvPath);
        // CSV is EUC-KR encoded (Korean)
        const content = iconv.decode(buffer, 'euc-kr');
        const rows = parseCSV(content);

        if (rows.length < 2) return [];

        // Parse header - clean whitespace
        const headers = rows[0].map(h => h.replace(/[\r\n]+/g, ' ').trim());

        console.log('Parsed headers (first 10):', headers.slice(0, 10));

        const wordIdx = headers.findIndex(h => h === 'Word');
        const posIdx = headers.findIndex(h => h.includes('Parts of Speech'));
        const koDefIdx = headers.findIndex(h => h.includes('Korean') && h.includes('Definition'));
        const enDefIdx = headers.findIndex(h => h.includes('English') && h.includes('Definition'));
        const exampleIdx = headers.findIndex(h => h.includes('Example Sentence'));
        const cefrIdx = headers.findIndex(h => h.includes('CEFR'));

        console.log('CSV Header indices:', { wordIdx, posIdx, koDefIdx, enDefIdx, exampleIdx, cefrIdx });

        const entries: VocabEntry[] = [];
        const seenWords = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (cols.length <= wordIdx) continue;
            const word = cols[wordIdx]?.replace(/[\r\n]/g, '').trim();

            if (!word || seenWords.has(word.toLowerCase())) continue;

            const koreanDef = cols[koDefIdx]?.trim() || '';
            const englishDef = cols[enDefIdx]?.trim() || '';

            // Only include entries with definitions
            if (!koreanDef && !englishDef) continue;

            seenWords.add(word.toLowerCase());
            entries.push({
                word,
                pos: cols[posIdx]?.trim() || '',
                koreanDef,
                englishDef,
                example: cols[exampleIdx]?.trim() || '',
                cefr: cols[cefrIdx]?.trim() || ''
            });
        }

        vocabCache = entries;
        console.log(`Loaded ${entries.length} vocabulary entries for quiz`);
        return entries;
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        return [];
    }
};

// Get vocabulary info for a specific word (for graph display)
export const getVocabularyInfo = (targetWord: string): VocabEntry | null => {
    const vocab = loadVocabularyData();
    return vocab.find(v => v.word.toLowerCase() === targetWord.toLowerCase()) || null;
};

// Get random words from vocabulary (for related words in graph)
export const getRandomWords = (count: number, excludeWord?: string): string[] => {
    const vocab = loadVocabularyData();
    const filtered = excludeWord
        ? vocab.filter(v => v.word.toLowerCase() !== excludeWord.toLowerCase())
        : vocab;

    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(v => v.word);
};

// Generate quiz for a specific word using CSV data
export const generateWordQuiz = (targetWord: string): QuizItem | null => {
    const vocab = loadVocabularyData();
    if (vocab.length === 0) return null;

    // Find the target word
    const target = vocab.find(v => v.word.toLowerCase() === targetWord.toLowerCase());

    if (!target) {
        // Word not found in CSV
        return null;
    }

    // Get random distractors (other words with definitions)
    const distractors = vocab
        .filter(v => v.word.toLowerCase() !== targetWord.toLowerCase() && v.koreanDef)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    if (distractors.length < 3) return null;

    // Randomly choose quiz type
    const hasKoDef = !!target.koreanDef;
    const hasEnDef = !!target.englishDef;

    const quizTypes: string[] = [];
    if (hasKoDef) quizTypes.push('definition_ko');
    if (hasEnDef) quizTypes.push('definition_en');

    if (quizTypes.length === 0) return null;

    const quizType = quizTypes[Math.floor(Math.random() * quizTypes.length)];

    if (quizType === 'definition_en' && target.englishDef) {
        // What is the English meaning of X?
        const validDistractors = distractors.filter(d => d.englishDef);
        if (validDistractors.length >= 3) {
            const options = [
                target.englishDef,
                ...validDistractors.slice(0, 3).map(d => d.englishDef)
            ].sort(() => Math.random() - 0.5);

            return {
                type: 'definition',
                question: `What is the meaning of "${target.word}"?`,
                options,
                answer: target.englishDef,
                wordId: target.word
            };
        }
    }

    // Default: Korean definition quiz
    if (target.koreanDef) {
        const options = [
            target.koreanDef,
            ...distractors.slice(0, 3).map(d => d.koreanDef)
        ].sort(() => Math.random() - 0.5);

        return {
            type: 'definition',
            question: `"${target.word}" ${target.pos ? `(${target.pos})` : ''} 의 뜻은?`,
            options,
            answer: target.koreanDef,
            wordId: target.word
        };
    }

    return null;
};

// Generate a random quiz from vocabulary
export const generateRandomQuiz = (): QuizItem | null => {
    const vocab = loadVocabularyData();
    if (vocab.length < 4) return null;

    // Pick a random word with a Korean definition
    const validWords = vocab.filter(v => v.koreanDef);
    if (validWords.length < 4) return null;

    const randomIndex = Math.floor(Math.random() * validWords.length);
    const target = validWords[randomIndex];

    return generateWordQuiz(target.word);
};

// Original Neo4j-based quiz generation (kept for compatibility)
export const generateQuiz = async (learnerId: string, targetWord?: string): Promise<QuizItem | null> => {
    // If targetWord is provided, try CSV-based quiz first
    if (targetWord) {
        const csvQuiz = generateWordQuiz(targetWord);
        if (csvQuiz) return csvQuiz;
    }

    // Try random CSV quiz
    const randomCsvQuiz = generateRandomQuiz();
    if (randomCsvQuiz) return randomCsvQuiz;

    // Fallback to Neo4j-based quiz
    const driver = getDriver();
    if (!driver) {
        // No DB, no CSV data available
        return null;
    }

    const session = driver.session();

    try {
        // 1. Pick target word
        const targetQuery = `
      MATCH (l:Learner {id: $learnerId})-[r:LEARNING|FORGOT]->(w:Word)-[:HAS_SENSE]->(s:Sense)
      RETURN w.lemma as word, s.definition_en as def, s.definition_ko as defKo
      ORDER BY r.last_seen ASC
      LIMIT 1
    `;

        const randomQuery = `
      MATCH (w:Word)-[:HAS_SENSE]->(s:Sense)
      RETURN w.lemma as word, s.definition_en as def, s.definition_ko as defKo
      LIMIT 1
    `;

        let result = await session.run(targetQuery, { learnerId });
        if (result.records.length === 0) {
            result = await session.run(randomQuery);
        }

        if (result.records.length === 0) return null;

        const record = result.records[0];
        const word = record.get('word');
        const targetDef = record.get('defKo') || record.get('def');

        // 2. Get distractors
        const distractorQuery = `
      MATCH (w:Word)-[:HAS_SENSE]->(s:Sense)
      WHERE w.lemma <> $targetWord
      WITH coalesce(s.definition_ko, s.definition_en) as def
      WHERE def IS NOT NULL
      ORDER BY rand()
      LIMIT 3
      RETURN def
    `;

        const distResult = await session.run(distractorQuery, { targetWord: word });
        const distractors = distResult.records.map(r => r.get('def'));

        if (distractors.length < 3) return null;

        const options = [targetDef, ...distractors].sort(() => Math.random() - 0.5);

        return {
            type: 'definition',
            question: `"${word}" 의 뜻은?`,
            options,
            answer: targetDef,
            wordId: word
        };

    } finally {
        await session.close();
    }
};

export const submitQuizResult = async (learnerId: string, wordId: string, isCorrect: boolean) => {
    const driver = getDriver();
    if (!driver) {
        // Just log if no DB
        console.log(`Quiz result: ${wordId} - ${isCorrect ? 'correct' : 'incorrect'}`);
        return { message: 'Logged (no DB)' };
    }

    const session = driver.session();

    try {
        const now = new Date().toISOString();

        await session.run(`
        MATCH (l:Learner {id: $learnerId})
        MATCH (w:Word {lemma: $wordId})
        MERGE (l)-[r:LEARNING]->(w)
        SET r.last_seen = $now
        SET r.correct_count = coalesce(r.correct_count, 0) + $inc
        SET r.total_count = coalesce(r.total_count, 0) + 1
        SET r.strength = (toFloat(r.correct_count) / r.total_count)
      `, {
            learnerId,
            wordId,
            now,
            inc: isCorrect ? 1 : 0
        });

        return { message: 'Updated' };
    } finally {
        await session.close();
    }
};
