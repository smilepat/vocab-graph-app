import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface GraphNode {
    id: string;
    type: string;
    properties: {
        text?: string;
        display?: string;
        meaning_ko?: string;
        definition_en?: string;
        sentence?: string;
        [key: string]: unknown;
    };
}

interface VocabularyGraph {
    nodes: GraphNode[];
    edges: { source: string; target: string; type: string }[];
}

let graphCache: VocabularyGraph | null = null;

function loadGraph(): VocabularyGraph | null {
    if (graphCache) return graphCache;

    const graphPath = path.join(process.cwd(), 'data/vocabulary_graph.json');
    if (!fs.existsSync(graphPath)) return null;

    try {
        const content = fs.readFileSync(graphPath, 'utf-8');
        graphCache = JSON.parse(content);
        return graphCache;
    } catch {
        return null;
    }
}

function getRandomItems<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetWord = searchParams.get('word');

    const graph = loadGraph();
    if (!graph) {
        return NextResponse.json({ error: 'Graph data not available' }, { status: 500 });
    }

    // Get all word nodes with definitions
    const wordNodes = graph.nodes.filter(n =>
        n.type === 'Word' &&
        (n.properties.meaning_ko || n.properties.definition_en)
    );

    if (wordNodes.length < 4) {
        return NextResponse.json({ error: 'Not enough vocabulary data' }, { status: 500 });
    }

    // Find target word or pick random
    let targetNode: GraphNode | undefined;
    if (targetWord) {
        targetNode = wordNodes.find(n =>
            n.properties.text?.toLowerCase() === targetWord.toLowerCase() ||
            n.properties.display?.toLowerCase() === targetWord.toLowerCase()
        );
    }

    if (!targetNode) {
        targetNode = getRandomItems(wordNodes, 1)[0];
    }

    const word = targetNode.properties.display || targetNode.properties.text || 'unknown';
    const correctAnswer = targetNode.properties.meaning_ko || targetNode.properties.definition_en || '';

    // Get distractors (other word definitions)
    const otherWords = wordNodes.filter(n => n.id !== targetNode!.id);
    const distractors = getRandomItems(otherWords, 3).map(n =>
        n.properties.meaning_ko || n.properties.definition_en || ''
    ).filter(d => d && d !== correctAnswer);

    // Ensure we have enough distractors
    while (distractors.length < 3) {
        distractors.push(`Alternative meaning ${distractors.length + 1}`);
    }

    // Shuffle options
    const options = [correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);

    return NextResponse.json({
        question: `"${word}"의 뜻은?`,
        options,
        answer: correctAnswer,
        wordId: word
    });
}
