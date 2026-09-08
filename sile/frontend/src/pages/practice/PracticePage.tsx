import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import { adaptiveService } from '../../services/adaptive.service';
import {
  PracticeSession,
  PracticeResult,
} from '../../types/practice.types';
import { Topic } from '../../types/curriculum.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';


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
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-20 w-full rounded-xl mb-4" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER RESULTS SCREEN
  // ---------------------------------------------------------------------------
  if (result) {
    const isPassing = result.percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Results Header Card */}
        <Card variant="elevated" className="p-6 sm:p-8 text-center space-y-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 mx-auto">
            {isPassing ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Badge variant="neutral" size="sm">{result.topic_name}</Badge>
              <Badge variant={isPassing ? 'success' : 'warning'} size="sm">
                {isPassing ? 'Mastery Verified' : 'Practice Review'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
              Practice Assessment Results
            </h1>
          </div>

          {/* Score & Accuracy */}
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold text-brand-600 dark:text-brand-400">
              {result.percentage}%
            </span>
            <span className="text-sm font-semibold text-surface-500">
              ({result.score} of {result.total_questions} questions correct)
            </span>
          </div>

          {/* Mastery Advancement Comparison */}
          <div className="p-4 bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-750 rounded-xl max-w-md mx-auto space-y-2 text-left">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-surface-500">Mastery Index:</span>
              <span className="text-surface-800 dark:text-surface-200">
                {result.previous_mastery}% → <strong className="text-brand-600 dark:text-brand-400">{result.updated_mastery}%</strong>
              </span>
            </div>
            <div className="w-full bg-surface-200 dark:bg-surface-750 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${result.updated_mastery}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-surface-500">
              <span>Status: <strong className="capitalize text-surface-800 dark:text-surface-200">{result.mastery_status}</strong></span>
              <span>Calibrated Level: <strong className="capitalize text-surface-800 dark:text-surface-200">{result.difficulty_adjusted_to}</strong></span>
            </div>
          </div>

          {/* Recommended Next Action Spotlight */}
          <div className="p-4 bg-brand-50/70 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/40 rounded-xl text-xs text-brand-950 dark:text-brand-200 text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>👉</span> Recommended Next Action:
            </div>
            <p className="leading-relaxed">{result.recommended_next_action}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {result.next_content_id && (
              <Button
                variant="primary"
                onClick={() => navigate(`/content/${result.next_content_id}`)}
              >
                Continue to Recommended Lesson →
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => startPracticeSession(result.topic_id)}
            >
              Practice Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Back to Learning Home
            </Button>
          </div>
        </Card>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white px-1">
            Question-by-Question Review ({result.reviews.length})
          </h2>

          <div className="space-y-3">
            {result.reviews.map((rev, idx) => (
              <div
                key={rev.question_id || idx}
                className={`p-5 rounded-xl border ${
                  rev.is_correct
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-850/60'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-850/60'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase text-surface-500">
                    Question {idx + 1}
                  </span>
                  <Badge
                    variant={rev.is_correct ? 'success' : 'danger'}
                    size="sm"
                  >
                    {rev.is_correct ? 'Correct ✓' : 'Incorrect ✗'}
                  </Badge>
                </div>

                <p className="font-semibold text-surface-900 dark:text-surface-100 text-sm mb-3">
                  {rev.question_text}
                </p>

                <div className="text-xs space-y-1 mb-3">
                  <div>
                    <span className="text-surface-500">Your Answer: </span>
                    <strong className={rev.is_correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                      {rev.selected_answer || '(No answer provided)'}
                    </strong>
                  </div>
                  {!rev.is_correct && (
                    <div>
                      <span className="text-surface-500">Correct Answer: </span>
                      <strong className="text-emerald-700 dark:text-emerald-400">{rev.correct_answer}</strong>
                    </div>
                  )}
                </div>

                {rev.explanation && (
                  <div className="p-3 bg-white/80 dark:bg-surface-850/80 rounded-lg border border-surface-200 dark:border-surface-750 text-xs text-surface-700 dark:text-surface-300">
                    <strong className="text-surface-900 dark:text-surface-100">Explanation: </strong>
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
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Header & Topic Switcher */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-surface-200 dark:border-surface-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" size="sm">{session.topic_name}</Badge>
              <Badge variant="neutral" size="sm">{session.calibrated_difficulty} Level</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
              Adaptive Practice Session
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={session.topic_id}
              onChange={(e) => startPracticeSession(e.target.value)}
              className="text-xs bg-white dark:bg-surface-850 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 font-medium text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Progress Bar Card */}
        <div className="bg-white dark:bg-surface-850 rounded-xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-surface-600 dark:text-surface-400">
            <span>
              Question {currentIndex + 1} of {totalQ}
            </span>
            <span>{progressPct}% Completed</span>
          </div>
          <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>

        {/* Current Question Card */}
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Question #{currentIndex + 1}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white leading-snug">
              {currentQ.question_text}
            </h2>
          </div>

          {/* Multiple-Choice Options */}
          <div className="space-y-3" role="radiogroup" aria-label={`Question ${currentIndex + 1}`}>
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentQ.id] === opt.key;

              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectAnswer(currentQ.id, opt.key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 font-semibold ring-2 ring-brand-200 dark:ring-brand-800/80 shadow-sm'
                      : 'border-surface-200 dark:border-surface-750 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-surface-50 dark:hover:bg-surface-800/60 text-surface-800 dark:text-surface-200'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
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
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>💡</span>
                <span>{showHint ? 'Hide Hint' : 'Need a Conceptual Hint?'}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                  {currentQ.hint}
                </div>
              )}
            </div>
          )}

          {/* Navigation & Submit Bar */}
          <div className="pt-6 border-t border-surface-100 dark:border-surface-800 flex justify-between items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowHint(false);
                setCurrentIndex((prev) => Math.max(prev - 1, 0));
              }}
              disabled={currentIndex === 0}
            >
              ← Previous
            </Button>

            {isLast ? (
              <Button
                variant="primary"
                onClick={handleSubmitPractice}
                disabled={submitting || !isAnswered}
              >
                {submitting ? 'Evaluating...' : 'Submit Practice ✓'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowHint(false);
                  setCurrentIndex((prev) => Math.min(prev + 1, totalQ - 1));
                }}
              >
                Next Question →
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Fallback: No questions available
  return (
    <EmptyState
      title="No Practice Questions Found"
      description="Please select a curriculum topic to begin your adaptive practice session."
      action={
        <Button variant="primary" onClick={() => navigate('/topics')}>
          Browse Curriculum Topics
        </Button>
      }
    />
  );
};
