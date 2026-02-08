import { NextRequest, NextResponse } from 'next/server';
import { getWordGraphData } from '@/lib/graphDataService';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ word: string }> }
) {
    const { word } = await params;

    if (!word) {
        return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    const graphData = getWordGraphData(word.toLowerCase());

    if (graphData && graphData.nodes.length > 0) {
        return NextResponse.json(graphData);
    }

    // Return empty result if word not found
    return NextResponse.json({
        nodes: [{ id: word, group: 'Word', val: 20 }],
        links: []
    });
}
