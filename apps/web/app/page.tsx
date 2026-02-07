"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KnowledgeGraph from "./components/KnowledgeGraph";
import { Search } from "lucide-react";
import * as api from "@/lib/api";
import axios from "axios";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartQuiz = (word: string) => {
    router.push(`/quiz?word=${encodeURIComponent(word)}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`http://localhost:3001/search/${encodeURIComponent(query.trim())}`);
      setGraphData(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to search. Make sure API server is running.');
      // Fallback to mock data
      const mockData = {
        nodes: [
          { id: query, group: "Word", val: 20 },
          { id: `Definition of ${query}`, group: "Sense", val: 12 },
          { id: `Example using ${query}`, group: "Example", val: 8 },
          { id: `${query}_related`, group: "Word", val: 15 },
        ],
        links: [
          { source: query, target: `Definition of ${query}`, type: "HAS_SENSE" },
          { source: `Definition of ${query}`, target: `Example using ${query}`, type: "HAS_EXAMPLE" },
          { source: query, target: `${query}_related`, type: "RELATED_TO" },
        ],
      };
      setGraphData(mockData as any);
    } finally {
      setLoading(false);
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
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {loading ? 'Searching...' : 'Explore'}
            </button>
          </form>
          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

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
                    <button
                      onClick={() => handleStartQuiz(selectedNode.id)}
                      className="w-full bg-green-50 text-green-700 py-2 rounded border border-green-200 hover:bg-green-100 transition"
                    >
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

      {/* How It Works Section */}
      <HowItWorksSection />
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">How It Works</h2>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Usage Guide */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Usage Guide</h3>
          <ol className="space-y-3 text-slate-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <strong>Setup</strong>: Start Neo4j database and API server (port 3001)
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <strong>Import Data</strong>: POST to <code className="bg-slate-100 px-1 rounded">/import-csv</code> to load vocabulary
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <strong>Explore</strong>: Search words to visualize their relationships in the Knowledge Graph
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <div>
                <strong>Learn</strong>: Click nodes to see details, take quizzes at <code className="bg-slate-100 px-1 rounded">/quiz</code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <div>
                <strong>AI Tutor</strong>: Get personalized study recommendations based on your weak spots
              </div>
            </li>
          </ol>
        </div>

        {/* Architecture */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-purple-600 mb-4">Architecture</h3>
          <div className="space-y-4 text-slate-700">
            <div>
              <h4 className="font-medium text-slate-800">Tech Stack</h4>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Frontend: Next.js 16 + React 19 + Tailwind CSS</li>
                <li>Backend: Express.js + TypeScript (port 3001)</li>
                <li>Database: Neo4j Graph Database (port 7687)</li>
                <li>AI: Azure OpenAI GPT-4o</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-800">Knowledge Graph Ontology</h4>
              <div className="mt-2 text-sm bg-slate-50 p-3 rounded font-mono">
                <div className="text-blue-600">Nodes: Word, Sense, Example, Topic, Level, Learner</div>
                <div className="text-purple-600 mt-1">Edges: HAS_SENSE, HAS_EXAMPLE, RELATED_TO, KNOWS, LEARNING</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800">How Learning Works</h4>
              <p className="mt-1 text-sm">
                Your quiz attempts create <code className="bg-slate-100 px-1 rounded">ATTEMPTED</code> relationships.
                The AI analyzes this graph to find words you struggle with and generates personalized mnemonics and examples.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Quick Reference */}
      <div className="mt-6 bg-slate-800 text-slate-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">API Quick Reference</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm font-mono">
          <div>
            <span className="text-green-400">GET</span> /test-db
            <p className="text-slate-400 font-sans text-xs mt-1">Test Neo4j connection</p>
          </div>
          <div>
            <span className="text-yellow-400">POST</span> /import-csv
            <p className="text-slate-400 font-sans text-xs mt-1">Import vocabulary data</p>
          </div>
          <div>
            <span className="text-yellow-400">POST</span> /learners/init
            <p className="text-slate-400 font-sans text-xs mt-1">Initialize learner profiles</p>
          </div>
          <div>
            <span className="text-green-400">GET</span> /quiz/:learnerId
            <p className="text-slate-400 font-sans text-xs mt-1">Generate quiz question</p>
          </div>
          <div>
            <span className="text-yellow-400">POST</span> /quiz/:learnerId/submit
            <p className="text-slate-400 font-sans text-xs mt-1">Submit quiz answer</p>
          </div>
          <div>
            <span className="text-green-400">GET</span> /agent/recommend/:learnerId
            <p className="text-slate-400 font-sans text-xs mt-1">Get AI recommendation</p>
          </div>
        </div>
      </div>
    </section>
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
