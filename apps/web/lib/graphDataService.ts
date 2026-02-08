import fs from 'fs';
import path from 'path';

interface GraphNode {
    id: string;
    type: string;
    properties: {
        text?: string;
        display?: string;
        stem?: string;
        pos?: string;
        ipa?: string;
        cefr?: string;
        freq_rank?: number;
        meaning_ko?: string;
        definition_en?: string;
        sentence?: string;
        name?: string;
        pattern?: string;
        code?: string;
    };
}

interface GraphEdge {
    source: string;
    target: string;
    type: string;
    properties?: Record<string, unknown>;
}

interface VocabularyGraph {
    metadata: {
        stats: {
            nodesCreated: number;
            edgesCreated: number;
            byNodeType: Record<string, number>;
            byEdgeType: Record<string, number>;
        };
    };
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface VisualizationNode {
    id: string;
    group: string;
    val: number;
    label?: string;
    properties?: Record<string, unknown>;
}

interface VisualizationLink {
    source: string;
    target: string;
    type: string;
}

// Cache for graph data
let graphCache: VocabularyGraph | null = null;
let nodeIndex: Map<string, GraphNode> = new Map();
let edgesBySource: Map<string, GraphEdge[]> = new Map();
let edgesByTarget: Map<string, GraphEdge[]> = new Map();

const loadGraphData = (): VocabularyGraph | null => {
    if (graphCache) return graphCache;

    const graphPath = path.join(process.cwd(), 'data/vocabulary_graph.json');

    if (!fs.existsSync(graphPath)) {
        console.error('vocabulary_graph.json not found at:', graphPath);
        return null;
    }

    try {
        console.log('Loading vocabulary graph from:', graphPath);
        const content = fs.readFileSync(graphPath, 'utf-8');
        graphCache = JSON.parse(content);

        if (graphCache) {
            graphCache.nodes.forEach(node => {
                nodeIndex.set(node.id, node);
            });

            graphCache.edges.forEach(edge => {
                if (!edgesBySource.has(edge.source)) {
                    edgesBySource.set(edge.source, []);
                }
                edgesBySource.get(edge.source)!.push(edge);

                if (!edgesByTarget.has(edge.target)) {
                    edgesByTarget.set(edge.target, []);
                }
                edgesByTarget.get(edge.target)!.push(edge);
            });

            console.log(`Loaded ${graphCache.nodes.length} nodes and ${graphCache.edges.length} edges`);
        }

        return graphCache;
    } catch (error) {
        console.error('Error loading vocabulary graph:', error);
        return null;
    }
};

const getNodeVisualization = (node: GraphNode, _edgeType: string): VisualizationNode | null => {
    switch (node.type) {
        case 'Word':
            return {
                id: node.properties.display || node.properties.text || node.id,
                group: 'Word',
                val: 18,
                label: node.properties.display || node.properties.text,
                properties: node.properties
            };
        case 'Synset':
            const def = node.properties.meaning_ko || node.properties.definition_en || '';
            return {
                id: def.substring(0, 50) || 'Definition',
                group: 'Sense',
                val: 14,
                label: def.substring(0, 50),
                properties: node.properties
            };
        case 'Example':
            const sentence = node.properties.sentence || '';
            return {
                id: sentence.substring(0, 60) || 'Example',
                group: 'Example',
                val: 10,
                label: sentence.substring(0, 60),
                properties: node.properties
            };
        case 'CEFRLevel':
            return {
                id: `Level: ${node.properties.code}`,
                group: 'Topic',
                val: 12,
                label: `CEFR ${node.properties.code}`,
                properties: node.properties
            };
        case 'Curriculum':
            return {
                id: `교육과정: ${node.properties.code}`,
                group: 'Topic',
                val: 12,
                label: node.properties.code,
                properties: node.properties
            };
        case 'Topic':
            return {
                id: `Topic: ${node.properties.name}`,
                group: 'Topic',
                val: 10,
                label: node.properties.name,
                properties: node.properties
            };
        case 'Domain':
            return {
                id: `Domain: ${node.properties.name}`,
                group: 'Topic',
                val: 10,
                label: node.properties.name,
                properties: node.properties
            };
        case 'Collocation':
            return {
                id: node.properties.pattern || 'Collocation',
                group: 'Example',
                val: 8,
                label: node.properties.pattern,
                properties: node.properties
            };
        default:
            return null;
    }
};

const buildGraphVisualization = (wordId: string): { nodes: VisualizationNode[], links: VisualizationLink[] } => {
    const nodes: VisualizationNode[] = [];
    const links: VisualizationLink[] = [];
    const addedNodeIds = new Set<string>();

    const wordNode = nodeIndex.get(wordId);
    if (!wordNode) return { nodes, links };

    const mainWord = wordNode.properties.display || wordNode.properties.text || wordId;
    nodes.push({
        id: mainWord,
        group: 'Word',
        val: 25,
        label: mainWord,
        properties: wordNode.properties
    });
    addedNodeIds.add(wordId);

    const outgoingEdges = edgesBySource.get(wordId) || [];
    const incomingEdges = edgesByTarget.get(wordId) || [];

    outgoingEdges.forEach(edge => {
        const targetNode = nodeIndex.get(edge.target);
        if (!targetNode || addedNodeIds.has(edge.target)) return;

        const nodeInfo = getNodeVisualization(targetNode, edge.type);
        if (nodeInfo && nodes.length < 30) {
            nodes.push(nodeInfo);
            addedNodeIds.add(edge.target);
            links.push({
                source: mainWord,
                target: nodeInfo.id,
                type: edge.type
            });
        }
    });

    incomingEdges.forEach(edge => {
        if (addedNodeIds.has(edge.source)) return;

        const sourceNode = nodeIndex.get(edge.source);
        if (!sourceNode) return;

        if (sourceNode.type === 'Word' && nodes.length < 30) {
            const nodeInfo = getNodeVisualization(sourceNode, edge.type);
            if (nodeInfo) {
                nodes.push(nodeInfo);
                addedNodeIds.add(edge.source);
                links.push({
                    source: nodeInfo.id,
                    target: mainWord,
                    type: edge.type
                });
            }
        }
    });

    return { nodes, links };
};

export const getWordGraphData = (word: string): { nodes: VisualizationNode[], links: VisualizationLink[] } | null => {
    const graph = loadGraphData();
    if (!graph) return null;

    const searchWord = word.toLowerCase();
    const wordId = `word:${searchWord}`;
    const wordNode = nodeIndex.get(wordId);

    if (wordNode) {
        return buildGraphVisualization(wordId);
    }

    const exactDisplayMatch = graph.nodes.find(n =>
        n.type === 'Word' &&
        (n.properties.text?.toLowerCase() === searchWord ||
            n.properties.display?.toLowerCase() === searchWord)
    );

    if (exactDisplayMatch) {
        return buildGraphVisualization(exactDisplayMatch.id);
    }

    const prefixMatches = graph.nodes.filter(n =>
        n.type === 'Word' &&
        (n.properties.text?.toLowerCase().startsWith(searchWord) ||
            n.properties.display?.toLowerCase().startsWith(searchWord))
    );

    if (prefixMatches.length > 0) {
        prefixMatches.sort((a, b) =>
            (a.properties.text?.length || 0) - (b.properties.text?.length || 0)
        );
        return buildGraphVisualization(prefixMatches[0].id);
    }

    return null;
};

export const getGraphStats = () => {
    const graph = loadGraphData();
    if (!graph) return null;
    return graph.metadata.stats;
};

export const getSynonyms = (word: string, limit: number = 5): string[] => {
    const graph = loadGraphData();
    if (!graph) return [];

    const wordId = `word:${word.toLowerCase()}`;
    const synonyms: string[] = [];

    const outgoing = edgesBySource.get(wordId) || [];
    outgoing.forEach(edge => {
        if (edge.type === 'SYNONYM_OF') {
            const targetNode = nodeIndex.get(edge.target);
            if (targetNode?.properties.display) {
                synonyms.push(targetNode.properties.display);
            }
        }
    });

    const incoming = edgesByTarget.get(wordId) || [];
    incoming.forEach(edge => {
        if (edge.type === 'SYNONYM_OF') {
            const sourceNode = nodeIndex.get(edge.source);
            if (sourceNode?.properties.display) {
                synonyms.push(sourceNode.properties.display);
            }
        }
    });

    return [...new Set(synonyms)].slice(0, limit);
};

export const getAntonyms = (word: string, limit: number = 5): string[] => {
    const graph = loadGraphData();
    if (!graph) return [];

    const wordId = `word:${word.toLowerCase()}`;
    const antonyms: string[] = [];

    const outgoing = edgesBySource.get(wordId) || [];
    outgoing.forEach(edge => {
        if (edge.type === 'ANTONYM_OF') {
            const targetNode = nodeIndex.get(edge.target);
            if (targetNode?.properties.display) {
                antonyms.push(targetNode.properties.display);
            }
        }
    });

    const incoming = edgesByTarget.get(wordId) || [];
    incoming.forEach(edge => {
        if (edge.type === 'ANTONYM_OF') {
            const sourceNode = nodeIndex.get(edge.source);
            if (sourceNode?.properties.display) {
                antonyms.push(sourceNode.properties.display);
            }
        }
    });

    return [...new Set(antonyms)].slice(0, limit);
};
