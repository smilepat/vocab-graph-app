import { NextResponse } from 'next/server';
import { getGraphStats } from '@/lib/graphDataService';

export async function GET() {
    const stats = getGraphStats();

    if (!stats) {
        return NextResponse.json({ error: 'Graph data not available' }, { status: 500 });
    }

    return NextResponse.json(stats);
}
