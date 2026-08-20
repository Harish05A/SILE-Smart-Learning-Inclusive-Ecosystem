import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import { adaptiveService } from '../../services/adaptive.service';
import {
  PracticeSession,
  PracticeResult,
} from '../../types/practice.types';
import { Topic } from '../../types/curriculum.types';

export const PracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicIdParam = searchParams.get('topic_id');
  const contentIdParam = searchParams.get('content_id');

  const [topics, setTopics] = useState<Topic[]>([]);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    init();
  }, [topicIdParam]);

  const init = async () => {
    try {
      setLoading(true);
      setError(null);

      const allTopics = await adaptiveService.getTopics();
      setTopics(allTopics);

      if (topicIdParam) {
        await startPracticeSession(topicIdParam);
      } else if (allTopics.length > 0) {
        await startPracticeSession(allTopics[0].id);
      }
    } catch (err: any) {
      console.error('Failed to initialize practice:', err);
      setError(err.message || 'Failed to start practice session.');
    } finally {
      setLoading(false);
    }
  };

  const startPracticeSession = async (topicId: string) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setAnswers({});
      setCurrentIndex(0);
      setShowHint(false);

      const newSession = await practiceService.generatePracticeSession(topicId, 5);
      setSession(newSession);
    } catch (err: any) {
      console.error('Failed to generate practice session:', err);
      setError(err.message || 'Failed to generate practice questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, answerKey: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerKey,
    }));
  };

  const handleSubmitPractice = async () => {
    if (!session) return;

    try {
      setSubmitting(true);
      setError(null);

      const payloadAnswers = session.questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] || '',
      }));

      const res = await practiceService.submitPracticeSession({
        topic_id: session.topic_id,
        content_id: contentIdParam,
        answers: payloadAnswers,
      });

      setResult(res);
    } catch (err: any) {
      console.error('Failed to submit practice session:', err);
      setError(err.message || 'Failed to submit practice answers.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER RESULTS SCREEN
  // ---------------------------------------------------------------------------
  if (result) {
    const isPassing = result.percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Results Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-3xl">
            {isPassing ? '🎯' : '💡'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Practice Complete: {result.topic_name}
          </h1>

          {/* Score & Accuracy */}
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-4xl font-extrabold text-indigo-600">
              {result.percentage}%
            </span>
            <span className="text-sm font-semibold text-slate-500">
              ({result.score} of {result.total_questions} correct)
            </span>
          </div>

          {/* Mastery Advancement Comparison */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl max-w-md mx-auto space-y-2 text-left">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Mastery Index:</span>
              <span className="text-slate-800">
                {result.previous_mastery}% → <strong className="text-indigo-600">{result.updated_mastery}%</strong>
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${result.updated_mastery}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Status: <strong className="capitalize">{result.mastery_status}</strong></span>
              <span>Calibrated Level: <strong className="capitalize">{result.difficulty_adjusted_to}</strong></span>
            </div>
          </div>

          {/* Recommended Next Action Spotlight */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 text-left space-y-1">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>👉</span> Recommended Next Action:
            </div>
            <p className="leading-relaxed">{result.recommended_next_action}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {result.next_content_id && (
              <button
                onClick={() => navigate(`/content/${result.next_content_id}`)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md"
              >
                Continue to Recommended Lesson →
              </button>
            )}
            <button
              onClick={() => startPracticeSession(result.topic_id)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
            >
              Practice Again
            </button>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm"
            >
              Back to Learning Home
            </Link>
          </div>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 px-1">
            Question-by-Question Review ({result.reviews.length})
          </h2>

          <div className="space-y-3">
            {result.reviews.map((rev, idx) => (
              <div
                key={rev.question_id || idx}
                className={`p-5 rounded-2xl border ${
                  rev.is_correct
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-red-50/40 border-red-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Question {idx + 1}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      rev.is_correct
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {rev.is_correct ? 'Correct ✓' : 'Incorrect ✗'}
                  </span>
                </div>

                <p className="font-semibold text-slate-900 text-sm mb-3">
                  {rev.question_text}
                </p>

                <div className="text-xs space-y-1 mb-3">
                  <div>
                    <span className="text-slate-500">Your Answer: </span>
                    <strong className={rev.is_correct ? 'text-emerald-800' : 'text-red-700'}>
                      {rev.selected_answer || '(No answer provided)'}
                    </strong>
                  </div>
                  {!rev.is_correct && (
                    <div>
                      <span className="text-slate-500">Correct Answer: </span>
                      <strong className="text-emerald-700">{rev.correct_answer}</strong>
                    </div>
                  )}
                </div>

                {rev.explanation && (
                  <div className="p-3 bg-white/80 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <strong className="text-slate-800">Explanation: </strong>
                    {rev.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER ACTIVE PRACTICE SESSION SCREEN
  // ---------------------------------------------------------------------------
  if (session && session.questions.length > 0) {
    const currentQ = session.questions[currentIndex];
    const totalQ = session.total_questions;
    const progressPct = Math.round(((currentIndex + 1) / totalQ) * 100);
    const isAnswered = Boolean(answers[currentQ.id]);
    const isLast = currentIndex === totalQ - 1;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header & Topic Switcher */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 text-indigo-700">
                {session.topic_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-slate-100 text-slate-700">
                {session.calibrated_difficulty} Level
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Adaptive Practice Session
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={session.topic_id}
              onChange={(e) => startPracticeSession(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Progress Bar Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>
              Question {currentIndex + 1} of {totalQ}
            </span>
            <span>{progressPct}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>

        {/* Current Question Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Question #{currentIndex + 1}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQ.question_text}
            </h2>
          </div>

          {/* Multiple-Choice Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentQ.id] === opt.key;

              return (
                <button
                  key={opt.key}
                  onClick={() => handleSelectAnswer(currentQ.id, opt.key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold ring-2 ring-indigo-200 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="text-sm">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Hint Toggle */}
          {currentQ.hint && (
            <div>
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>💡</span>
                <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  {currentQ.hint}
                </div>
              )}
            </div>
          )}

          {/* Navigation & Submit Bar */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => {
                setShowHint(false);
                setCurrentIndex((prev) => Math.max(prev - 1, 0));
              }}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-xl"
            >
              ← Previous
            </button>

            {isLast ? (
              <button
                onClick={handleSubmitPractice}
                disabled={submitting || !isAnswered}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
              >
                {submitting ? 'Evaluating...' : 'Submit Practice ✓'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowHint(false);
                  setCurrentIndex((prev) => Math.min(prev + 1, totalQ - 1));
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                Next Question →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback: No questions available
  return (
    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4 max-w-lg mx-auto my-8">
      <div className="text-3xl">📚</div>
      <h2 className="text-lg font-bold text-slate-900">No Practice Questions Found</h2>
      <p className="text-xs text-slate-500">
        Please select a curriculum topic to begin adaptive practice.
      </p>
      <Link
        to="/topics"
        className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl"
      >
        Browse Curriculum Topics
      </Link>
    </div>
  );
};
