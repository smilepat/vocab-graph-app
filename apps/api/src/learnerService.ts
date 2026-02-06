import { getDriver } from './db';

// Bootstrap 3 dummy learners
export const initLearners = async () => {
    const driver = getDriver();
    if (!driver) throw new Error('DB Driver not initialized');
    const session = driver.session();

    try {
        // Merge learners to ensure they exist but don't duplicate
        await session.run(`
      MERGE (l1:Learner {id: 'learner_novice', name: 'Novice Kim', level: 'A1'})
      MERGE (l2:Learner {id: 'learner_inter', name: 'Intermediate Lee', level: 'B1'})
      MERGE (l3:Learner {id: 'learner_advanced', name: 'Advanced Park', level: 'C1'})
    `);
        console.log('Learners initialized.');
        return { message: 'Initialized 3 learners: Novice, Intermediate, Advanced' };
    } finally {
        await session.close();
    }
};

// Simulate random learning history
export const simulateHistory = async (learnerId: string, count: number = 20) => {
    const driver = getDriver();
    if (!driver) throw new Error('DB Driver not initialized');
    const session = driver.session();

    try {
        // 1. Get random words (assumes words exist)
        const result = await session.run(`
      MATCH (w:Word) 
      RETURN w.lemma as lemma
      LIMIT $limit
    `, { limit: count * 3 }); // Get more to pick from

        const words = result.records.map(r => r.get('lemma'));
        if (words.length === 0) return { message: 'No words found to learn' };

        // 2. Assign relationships
        const relationTypes = ['KNOWS', 'LEARNING', 'FORGOT'];
        let createdCount = 0;

        for (const word of words) {
            if (Math.random() > 0.3) continue; // Randomly skip to scatter data
            if (createdCount >= count) break;

            const type = relationTypes[Math.floor(Math.random() * relationTypes.length)];
            // Attributes: strength (0.0-1.0), correct_rate (0.0-1.0), last_seen (timestamp)
            const strength = Math.random();
            const correctRate = Math.random();
            const lastSeen = new Date().toISOString();

            await session.run(`
          MATCH (l:Learner {id: $learnerId})
          MATCH (w:Word {lemma: $word})
          MERGE (l)-[r:${type}]->(w)
          SET r.strength = $strength, r.correct_rate = $correctRate, r.last_seen = $lastSeen
        `, { learnerId, word, type, strength, correctRate, lastSeen });

            createdCount++;
        }

        return { message: `Simulated history for ${learnerId}: ${createdCount} words linked.` };
    } finally {
        await session.close();
    }
};
