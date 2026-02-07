import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDriver, getDriver } from './db';
import { importCsvData } from './importService';
import path from 'path';
import { getWordGraphData, getGraphStats, getSynonyms, getAntonyms, getWordDetails } from './graphDataService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB connection
initDriver();

app.get('/', (req: Request, res: Response) => {
    res.send('Vocabulary Graph API is running');
});

// Word search endpoint - returns graph data for visualization
app.get('/search/:word', async (req: Request, res: Response) => {
    const word = req.params.word.toLowerCase();

    // First, try to get data from vocabulary_graph.json (rich semantic data)
    const graphData = getWordGraphData(word);
    if (graphData && graphData.nodes.length > 0) {
        return res.json(graphData);
    }

    // Fallback to Neo4j if available
    const driver = getDriver();
    if (!driver) {
        // Return CSV-based mock data if neither graph JSON nor Neo4j available
        return res.json(getMockGraphData(word));
    }

    const session = driver.session();
    try {
        // Search for word and its relationships
        const result = await session.run(`
            MATCH (w:Word)
            WHERE toLower(w.lemma) CONTAINS $word OR toLower(w.word) CONTAINS $word
            OPTIONAL MATCH (w)-[r1:HAS_SENSE]->(s:Sense)
            OPTIONAL MATCH (s)-[r2:HAS_EXAMPLE]->(e:Example)
            OPTIONAL MATCH (w)-[r3:RELATED_TO]-(related:Word)
            OPTIONAL MATCH (w)-[r4:IN_TOPIC]->(t:Topic)
            OPTIONAL MATCH (w)-[r5:AT_LEVEL]->(l:Level)
            RETURN w, s, e, related, t, l
            LIMIT 50
        `, { word });

        if (result.records.length === 0) {
            // No results from DB, return mock data
            return res.json(getMockGraphData(word));
        }

        const nodes: any[] = [];
        const links: any[] = [];
        const nodeIds = new Set<string>();

        result.records.forEach(record => {
            const w = record.get('w');
            const s = record.get('s');
            const e = record.get('e');
            const related = record.get('related');
            const t = record.get('t');
            const l = record.get('l');

            if (w && !nodeIds.has(w.properties.lemma || w.properties.word)) {
                const wordId = w.properties.lemma || w.properties.word;
                nodeIds.add(wordId);
                nodes.push({ id: wordId, group: 'Word', val: 20 });
            }

            if (s && !nodeIds.has(s.properties.definition)) {
                const senseId = s.properties.definition?.substring(0, 50) || 'Sense';
                if (!nodeIds.has(senseId)) {
                    nodeIds.add(senseId);
                    nodes.push({ id: senseId, group: 'Sense', val: 12 });
                    links.push({
                        source: w.properties.lemma || w.properties.word,
                        target: senseId,
                        type: 'HAS_SENSE'
                    });
                }
            }

            if (e && !nodeIds.has(e.properties.text)) {
                const exampleId = e.properties.text?.substring(0, 40) || 'Example';
                if (!nodeIds.has(exampleId)) {
                    nodeIds.add(exampleId);
                    nodes.push({ id: exampleId, group: 'Example', val: 8 });
                    const senseId = s?.properties.definition?.substring(0, 50);
                    if (senseId) {
                        links.push({ source: senseId, target: exampleId, type: 'HAS_EXAMPLE' });
                    }
                }
            }

            if (related && !nodeIds.has(related.properties.lemma || related.properties.word)) {
                const relatedId = related.properties.lemma || related.properties.word;
                nodeIds.add(relatedId);
                nodes.push({ id: relatedId, group: 'Word', val: 15 });
                links.push({
                    source: w.properties.lemma || w.properties.word,
                    target: relatedId,
                    type: 'RELATED_TO'
                });
            }

            if (t && !nodeIds.has(t.properties.name)) {
                nodeIds.add(t.properties.name);
                nodes.push({ id: t.properties.name, group: 'Topic', val: 10 });
                links.push({
                    source: w.properties.lemma || w.properties.word,
                    target: t.properties.name,
                    type: 'IN_TOPIC'
                });
            }
        });

        res.json({ nodes, links });
    } catch (error: any) {
        console.error('Search error:', error.message);
        // Return mock data on error
        res.json(getMockGraphData(word));
    } finally {
        await session.close();
    }
});

// Import quiz service for vocabulary data
import { getVocabularyInfo, getRandomWords } from './quizService';

// Mock data generator for when DB is not available
function getMockGraphData(word: string) {
    // Try to get real vocabulary data
    const vocabInfo = getVocabularyInfo(word);
    const relatedWords = getRandomWords(3, word);

    if (vocabInfo) {
        // Use real vocabulary data
        const nodes: any[] = [
            { id: vocabInfo.word, group: 'Word', val: 20 },
        ];
        const links: any[] = [];

        // Add Korean definition as Sense
        if (vocabInfo.koreanDef) {
            const defId = vocabInfo.koreanDef.substring(0, 50);
            nodes.push({ id: defId, group: 'Sense', val: 12 });
            links.push({ source: vocabInfo.word, target: defId, type: 'HAS_SENSE' });
        }

        // Add example if available
        if (vocabInfo.example) {
            const exampleId = vocabInfo.example.substring(0, 60);
            nodes.push({ id: exampleId, group: 'Example', val: 8 });
            if (vocabInfo.koreanDef) {
                links.push({ source: vocabInfo.koreanDef.substring(0, 50), target: exampleId, type: 'HAS_EXAMPLE' });
            }
        }

        // Add related words (real vocabulary words)
        relatedWords.forEach((relatedWord: string) => {
            nodes.push({ id: relatedWord, group: 'Word', val: 15 });
            links.push({ source: vocabInfo.word, target: relatedWord, type: 'RELATED_TO' });
        });

        // Add CEFR level as Topic
        if (vocabInfo.cefr) {
            nodes.push({ id: `Level: ${vocabInfo.cefr}`, group: 'Topic', val: 10 });
            links.push({ source: vocabInfo.word, target: `Level: ${vocabInfo.cefr}`, type: 'AT_LEVEL' });
        }

        return { nodes, links };
    }

    // Fallback to basic mock if word not found
    return {
        nodes: [
            { id: word, group: 'Word', val: 20 },
            { id: `Definition of ${word}`, group: 'Sense', val: 12 },
            { id: 'Vocabulary', group: 'Topic', val: 10 },
        ],
        links: [
            { source: word, target: `Definition of ${word}`, type: 'HAS_SENSE' },
            { source: word, target: 'Vocabulary', type: 'IN_TOPIC' },
        ],
    };
}

// Graph statistics endpoint
app.get('/graph/stats', (req: Request, res: Response) => {
    const stats = getGraphStats();
    if (!stats) {
        return res.status(500).json({ error: 'Graph data not loaded' });
    }
    res.json(stats);
});

// Word details endpoint (with IPA, synonyms, antonyms)
app.get('/word/:word', (req: Request, res: Response) => {
    const word = req.params.word;
    const details = getWordDetails(word);
    const synonyms = getSynonyms(word, 10);
    const antonyms = getAntonyms(word, 10);

    if (!details) {
        return res.status(404).json({ error: 'Word not found in graph' });
    }

    res.json({
        ...details,
        synonyms,
        antonyms
    });
});

app.get('/test-db', async (req: Request, res: Response) => {
    const driver = getDriver();
    if (!driver) {
        return res.status(500).json({ error: 'DB Driver not initialized' });
    }
    const session = driver.session();
    try {
        const result = await session.run('MATCH (n) RETURN count(n) AS count');
        const count = result.records[0].get('count').toNumber();
        res.json({ count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.post('/init-sample', async (req: Request, res: Response) => {
    // Goal: Insert "Word" and "RELATED_TO"
    const driver = getDriver();
    if (!driver) return res.status(500).json({ error: 'No DB' });

    const session = driver.session();
    try {
        const cypher = `
      MERGE (w1:Word {lemma: 'apple'})
      MERGE (w2:Word {lemma: 'fruit'})
      MERGE (w1)-[:RELATED_TO]->(w2)
      RETURN w1, w2
    `;
        await session.run(cypher);
        res.json({ message: 'Sample data created: apple -> fruit' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.post('/import-csv', async (req: Request, res: Response) => {
    // Hardcoded path for MVP, as requested to use the existing file
    const filePath = "c:\\irt_vocab9000_google\\public\\master_vocabulary_table9000.csv";

    try {
        const stats = await importCsvData(filePath);
        res.json({ message: 'Import completed', stats });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

import { initLearners, simulateHistory } from './learnerService';
import { generateQuiz, submitQuizResult } from './quizService';

app.post('/learners/init', async (req: Request, res: Response) => {
    try {
        const result = await initLearners();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/learners/:id/simulate', async (req: Request, res: Response) => {
    try {
        const result = await simulateHistory(req.params.id, 20);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/quiz/:learnerId', async (req: Request, res: Response) => {
    try {
        const targetWord = req.query.word as string | undefined;
        const quiz = await generateQuiz(req.params.learnerId, targetWord);
        if (!quiz) return res.status(404).json({ message: 'No quiz items available' });
        res.json(quiz);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/quiz/:learnerId/submit', async (req: Request, res: Response) => {
    try {
        const { wordId, isCorrect } = req.body;
        await submitQuizResult(req.params.learnerId, wordId, isCorrect);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

import { recommendAndExplain } from './agentService';

// ... existing routes ...

app.get('/agent/recommend/:learnerId', async (req: Request, res: Response) => {
    try {
        const result = await recommendAndExplain(req.params.learnerId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
