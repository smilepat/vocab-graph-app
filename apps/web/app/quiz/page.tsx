"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

interface QuizItem {
    question: string;
    options: string[];
    answer: string;
    wordId: string;
}

export default function QuizPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const targetWord = searchParams.get('word');

    const [learnerId] = useState('learner_novice');
    const [quiz, setQuiz] = useState<QuizItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });

    // Auto-start quiz if word is provided
    useEffect(() => {
        if (targetWord) {
            generateWordQuiz(targetWord);
        }
    }, [targetWord]);

    const generateWordQuiz = async (word: string) => {
        setLoading(true);
        setResult(null);
        try {
            // Try to get quiz from API first
            const res = await axios.get(`http://localhost:3001/quiz/${learnerId}?word=${encodeURIComponent(word)}`);
            setQuiz(res.data);
        } catch (err) {
            // Fallback: generate a simple quiz locally
            const mockQuiz: QuizItem = {
                question: `What is the meaning of "${word}"?`,
                options: [
                    `Definition of ${word}`,
                    `Something unrelated to ${word}`,
                    `Another wrong answer`,
                    `Incorrect option`
                ],
                answer: `Definition of ${word}`,
                wordId: word
            };
            setQuiz(mockQuiz);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuiz = async () => {
        if (targetWord) {
            generateWordQuiz(targetWord);
        } else {
            setLoading(true);
            setResult(null);
            try {
                const res = await axios.get(`http://localhost:3001/quiz/${learnerId}`);
                setQuiz(res.data);
            } catch (err) {
                console.error(err);
                alert('Failed to load quiz. Make sure enough words are learned/simulated.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAnswer = async (selected: string) => {
        if (!quiz) return;
        const isCorrect = selected === quiz.answer;
        setResult(isCorrect ? 'correct' : 'incorrect');
        setScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1
        }));

        try {
            await axios.post(`http://localhost:3001/quiz/${learnerId}/submit`, {
                wordId: quiz.wordId,
                isCorrect
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">
                        ← Back to Graph
                    </Link>
                    {score.total > 0 && (
                        <span className="text-sm font-medium text-slate-600">
                            Score: {score.correct}/{score.total}
                        </span>
                    )}
                </div>

                <h1 className="text-2xl font-bold mb-2 text-center text-slate-800">
                    Vocabulary Quiz
                </h1>
                {targetWord && (
                    <p className="text-center text-blue-600 font-medium mb-4">
                        Testing: "{targetWord}"
                    </p>
                )}

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500">Loading quiz...</p>
                    </div>
                ) : !quiz ? (
                    <div className="text-center">
                        <p className="mb-4 text-slate-600">
                            {targetWord
                                ? `Ready to test your knowledge of "${targetWord}"?`
                                : `Ready to test your knowledge?`}
                        </p>
                        <button
                            onClick={fetchQuiz}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Start Quiz'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="mb-6">
                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                                Question
                            </span>
                            <p className="text-xl mt-2 font-medium text-slate-900">
                                {quiz.question}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {quiz.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => !result && handleAnswer(option)}
                                    disabled={!!result}
                                    className={`w-full text-left p-4 rounded-lg border transition
                    ${result && option === quiz.answer
                                            ? 'bg-green-100 border-green-500 text-green-900'
                                            : result && option !== quiz.answer && result === 'incorrect' // Highlight selected wrong answer logic omitted for simplicity, just highlight correct
                                                ? 'opacity-50'
                                                : 'border-slate-200 hover:bg-slate-50 hover:border-blue-300'
                                        }
                  `}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>

                        {result && (
                            <div className="mt-6 text-center animate-fade-in">
                                <p className={`text-lg font-bold mb-4 ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
                                    {result === 'correct' ? 'Correct! 🎉' : 'Incorrect 😢'}
                                </p>
                                <button
                                    onClick={fetchQuiz}
                                    className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-700"
                                >
                                    Next Question
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
