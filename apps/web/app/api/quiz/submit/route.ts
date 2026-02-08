import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wordId, isCorrect } = body;

        // Log the result (in production, this would save to a database)
        console.log(`Quiz result: ${wordId} - ${isCorrect ? 'correct' : 'incorrect'}`);

        return NextResponse.json({
            message: 'Result recorded',
            wordId,
            isCorrect
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process submission' }, { status: 400 });
    }
}
