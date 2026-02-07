"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph2D as it uses window/canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-slate-400">Loading graph...</div>
});

interface GraphData {
    nodes: { id: string; group: string; val?: number }[];
    links: { source: string; target: string; type: string }[];
}

interface ComponentProps {
    data: GraphData;
    onNodeClick?: (node: any) => void;
}

const nodeColors: Record<string, string> = {
    Word: '#3b82f6',      // blue
    Sense: '#8b5cf6',     // purple
    Example: '#10b981',   // green
    Topic: '#f59e0b',     // amber
    Level: '#ef4444',     // red
};

export default function KnowledgeGraph({ data, onNodeClick }: ComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Center graph when data changes
    useEffect(() => {
        if (fgRef.current && data.nodes.length > 0) {
            setTimeout(() => {
                fgRef.current?.zoomToFit(400, 50);
            }, 500);
        }
    }, [data]);

    const hasData = data.nodes.length > 0;

    return (
        <div ref={containerRef} className="border rounded-lg overflow-hidden h-[600px] bg-slate-900 relative">
            {!hasData ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                        <p className="text-lg">Enter a word and click Explore</p>
                        <p className="text-sm mt-2">The knowledge graph will appear here</p>
                    </div>
                </div>
            ) : (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={data}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel={(node: any) => `${node.group}: ${node.id}`}
                    nodeColor={(node: any) => nodeColors[node.group] || '#6b7280'}
                    nodeVal={(node: any) => node.val || 10}
                    linkDirectionalArrowLength={6}
                    linkDirectionalArrowRelPos={1}
                    linkColor={() => '#475569'}
                    linkWidth={2}
                    onNodeClick={onNodeClick}
                    backgroundColor="#0f172a"
                    cooldownTicks={100}
                />
            )}
            {hasData && (
                <div className="absolute bottom-4 left-4 flex gap-2 text-xs">
                    {Object.entries(nodeColors).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                            <span className="text-slate-300">{type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
