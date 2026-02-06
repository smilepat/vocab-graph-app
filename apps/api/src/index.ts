import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDriver, getDriver } from './db';
import { importCsvData } from './importService';
import path from 'path';

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
        const quiz = await generateQuiz(req.params.learnerId);
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
