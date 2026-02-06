"use client";

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph2D as it uses window/canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
});

interface GraphData {
    nodes: { id: string; group: string; val?: number }[];
    links: { source: string; target: string; type: string }[];
}

interface ComponentProps {
    data: GraphData;
    onNodeClick?: (node: any) => void;
}

export default function KnowledgeGraph({ data, onNodeClick }: ComponentProps) {
    const fgRef = useRef<any>(null);

    return (
        <div className="border rounded-lg overflow-hidden h-[600px] bg-slate-900">
            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="id"
                nodeAutoColorBy="group"
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                onNodeClick={onNodeClick}
                backgroundColor="#0f172a"
            />
        </div>
    );
}
