import { getDriver } from './db';

interface QuizItem {
    question: string;
    options: string[];
    answer: string;
    wordId: string;
    type: 'definition' | 'synonym';
}

export const generateQuiz = async (learnerId: string, topic?: string): Promise<QuizItem | null> => {
    const driver = getDriver();
    if (!driver) throw new Error('DB Driver not initialized');
    const session = driver.session();

    try {
        // Strategy: Find a word the learner is 'LEARNING' or 'FORGOT'.
        // If topic is provided, filter by topic (not implemented in this MVP query yet).
        // Get the word, its sense definition, and 3 random other definitions as distractors.

        // 1. Pick target word
        const targetQuery = `
      MATCH (l:Learner {id: $learnerId})-[r:LEARNING|FORGOT]->(w:Word)-[:HAS_SENSE]->(s:Sense)
      RETURN w.lemma as word, s.definition_en as def
      ORDER BY r.last_seen ASC
      LIMIT 1
    `;

        // Fallback if no history: Pick any random word
        const randomQuery = `
      MATCH (w:Word)-[:HAS_SENSE]->(s:Sense)
      RETURN w.lemma as word, s.definition_en as def
      LIMIT 1
    `;

        let result = await session.run(targetQuery, { learnerId });
        if (result.records.length === 0) {
            result = await session.run(randomQuery);
        }

        if (result.records.length === 0) return null;

        const record = result.records[0];
        const targetWord = record.get('word');
        const targetDef = record.get('def');

        // 2. Get distractors (other definitions)
        const distractorQuery = `
      MATCH (w:Word)-[:HAS_SENSE]->(s:Sense)
      WHERE w.lemma <> $targetWord
      WITH s.definition_en as def
      ORDER BY rand()
      LIMIT 3
      RETURN def
    `;

        const distResult = await session.run(distractorQuery, { targetWord });
        const distractors = distResult.records.map(r => r.get('def'));

        // 3. Construct Quiz Item
        const options = [targetDef, ...distractors].sort(() => Math.random() - 0.5);

        return {
            type: 'definition',
            question: `What is the definition of "${targetWord}"?`,
            options,
            answer: targetDef,
            wordId: targetWord
        };

    } finally {
        await session.close();
    }
};

export const submitQuizResult = async (learnerId: string, wordId: string, isCorrect: boolean) => {
    const driver = getDriver();
    if (!driver) throw new Error('DB Driver not initialized');
    const session = driver.session();

    try {
        // Update logic:
        // If correct: shift to KNOWS if strength is high enough, or increase strength/correct_rate
        // If incorrect: shift to FORGOT or simply decrease strength

        const now = new Date().toISOString();
        const status = isCorrect ? 'KNOWS' : 'FORGOT'; // Simplified transition

        // We delete old relationship and create new one to change type easily in Neo4j 
        // (or we could just keep same type and update props, but let's follow the request's ontology types)

        // Simplified Logic: 
        // If currently LEARNING and Correct -> Update stats. if Correct 3 times in a row -> KNOWS
        // For MVP: simple update

        await session.run(`
        MATCH (l:Learner {id: $learnerId})
        MATCH (w:Word {lemma: $wordId})
        MERGE (l)-[r:LEARNING]->(w) -- Default to LEARNING if not exists
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
