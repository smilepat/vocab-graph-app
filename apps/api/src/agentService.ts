import { AzureOpenAI } from 'openai';
import { getDriver } from './db';
import dotenv from 'dotenv';

dotenv.config();

const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
});

export interface AgentResponse {
    action: string;
    data: any;
    reason: string;
}

// Agent C: Recommender & Explainer
// Goal: Analyze why a word is recommended and explain it to the user.
export const recommendAndExplain = async (learnerId: string) => {
    const driver = getDriver();
    if (!driver) throw new Error('DB Driver not initialized');
    const session = driver.session();

    try {
        // 1. Fetch Candidate Node (Logic: LEARNING with low strength)
        const result = await session.run(`
            MATCH (l:Learner {id: $learnerId})-[r:LEARNING]->(w:Word)
            WHERE r.strength < 0.5
            WITH w, r
            LIMIT 1
            MATCH (w)-[:HAS_SENSE]->(s:Sense)
            OPTIONAL MATCH (w)-[:RELATED_TO]->(related:Word)
            RETURN w.lemma as word, s.definition_en as def, collect(related.lemma) as related_words
        `, { learnerId });

        if (result.records.length === 0) return { message: 'No recommendations found' };

        const record = result.records[0];
        const context = {
            word: record.get('word'),
            definition: record.get('def'),
            related: record.get('related_words')
        };

        // 2. LLM Call: Generate personalized explanation
        const prompt = `
        You are a Vocabulary Tutor Agent.
        The user is struggling with the word "${context.word}".
        Definition: "${context.definition}".
        Related words they might know: ${context.related.join(', ')}.
        
        Task:
        1. Explain the word simply.
        2. Give a mnemonic or connection using the related words if helpful.
        3. Create a short, fun sentence using the word.
        
        Output JSON: { "explanation": "...", "mnemonic": "...", "sentence": "..." }
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: process.env.AZURE_OPENAI_DEPLOYMENT || '', // Azure client uses deployment, but types might require model field
            response_format: { type: "json_object" }
        });

        const aiContent = JSON.parse(completion.choices[0].message.content || '{}');

        return {
            word: context.word,
            ...aiContent
        };

    } catch (err: any) {
        console.error("Agent Error:", err);
        // Fallback if LLM fails
        return { message: "AI Agent is offline, but here is a word to study.", error: err.message };
    } finally {
        await session.close();
    }
};

// Agent A: Graph Builder (Expansion)
// Suggests new semantic relationships for a word
export const expandGraphNode = async (word: string) => {
    // This would use LLM to predict "Topic" or "Collocations" not present in CSV
    // and return Cypher query or JSON to insert them.
    // Placeholder implementation.
    return { message: `Agent A would analyze context for '${word}' and suggest adding Topic nodes.` };
};
