"use client";

import { useState } from "react";
import KnowledgeGraph from "./components/KnowledgeGraph";
import { Search } from "lucide-react";
import * as api from "@/lib/api";
import axios from "axios";

export default function Home() {
  const [query, setQuery] = useState("");
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    try {
      const mockData = {
        nodes: [
          { id: query, group: "Word", val: 20 },
          { id: "Definition 1", group: "Sense", val: 10 },
          { id: "Example 1", group: "Example", val: 5 },
          { id: "Synonym A", group: "Word", val: 15 },
        ],
        links: [
          { source: query, target: "Definition 1", type: "HAS_SENSE" },
          { source: "Definition 1", target: "Example 1", type: "HAS_EXAMPLE" },
          { source: query, target: "Synonym A", type: "RELATED_TO" },
        ],
      };
      setGraphData(mockData as any);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Ontology Vocab Learner
        </h1>
        <p className="text-slate-500">Personalized Learning via Knowledge Graph</p>
      </header>

      <div className="flex gap-6">
        {/* Left: Search & Graph */}
        <div className="w-2/3 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a word (e.g., Apple)..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Explore
            </button>
          </form>

          <KnowledgeGraph
            data={graphData}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Right: Details & AI Tutor */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Details</h2>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </span>
                  <p className="text-lg font-medium">{selectedNode.group}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Content
                  </span>
                  <p className="text-slate-700">{selectedNode.id}</p>
                </div>
                {selectedNode.group === 'Word' && (
                  <div className="pt-4">
                    <button className="w-full bg-green-50 text-green-700 py-2 rounded border border-green-200 hover:bg-green-100">
                      Start Quiz for "{selectedNode.id}"
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-10">
                Select a node to view details
              </p>
            )}
          </div>
          <AITutorPanel />
        </div>
      </div>
    </div>
  );
}

function AITutorPanel() {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/agent/recommend/learner_novice');
      setRecommendation(res.data);
    } catch (err) {
      console.error(err);
      alert('AI Tutor is currently offline (Check API Server & Key)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 shadow-sm border border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-indigo-900">🤖 AI Tutor</h2>
        <button
          onClick={getRecommendation}
          disabled={loading}
          className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Get Suggestion'}
        </button>
      </div>

      {recommendation ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase">Focus Word</span>
            <p className="text-2xl font-bold text-indigo-800">{recommendation.word}</p>
          </div>

          {recommendation.explanation && (
            <div className="bg-white p-3 rounded border border-indigo-100">
              <p className="text-slate-700 text-sm leading-relaxed">
                {recommendation.explanation}
              </p>
            </div>
          )}

          {recommendation.mnemonic && (
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase">Mnemonic</span>
              <p className="text-indigo-700 italic text-sm">"{recommendation.mnemonic}"</p>
            </div>
          )}

          {recommendation.sentence && (
            <div className="bg-indigo-100 p-3 rounded">
              <p className="text-indigo-900 font-medium text-sm">
                "{recommendation.sentence}"
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-indigo-300">
          <p>I can analyze your weak spots and suggest personalized study tips.</p>
        </div>
      )}
    </div>
  );
}
