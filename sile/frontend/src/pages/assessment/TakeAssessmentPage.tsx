import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessment.service';
import { AssessmentDetail } from '../../types/assessment.types';
import { useAccessibility } from '../../hooks/useAccessibility';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';

export const TakeAssessmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { textToSpeechEnabled, speakText, stopSpeaking } = useAccessibility();

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchDetail = async () => {
      if (!id) return;
      try {
        const data = await assessmentService.getAssessmentById(id);
        if (isMounted) {
          setAssessment(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.error?.message ||
              'Unable to load questions for this assessment. Please return to the dashboard.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
      stopSpeaking();
    };
  }, [id, stopSpeaking]);

  // Read question automatically if TTS is enabled
  useEffect(() => {
    if (textToSpeechEnabled && assessment?.questions?.[currentIndex]) {
      const q = assessment.questions[currentIndex];
      const speechText = `Question ${currentIndex + 1}. ${q.question_text}. Options: ${q.options
        .map((o) => `Option ${o.key}: ${o.text}`)
        .join('. ')}`;
      speakText(speechText);
    }
  }, [currentIndex, textToSpeechEnabled, assessment, speakText]);

  // Escape listener for confirmation modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showConfirmModal) {
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  const handleSelectOption = useCallback((optionKey: string) => {
    if (!assessment) return;
    const currentQ = assessment.questions[currentIndex];
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionKey,
    }));
  }, [assessment, currentIndex]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return (
      <EmptyState
        title="Assessment Questions Not Found"
        description={errorMessage || 'Unable to locate questions for this baseline assessment.'}
        action={
          <Button variant="primary" onClick={() => navigate('/assessments')}>
            Back to Assessments
          </Button>
        }
      />
    );
  }

  const currentQuestion = assessment.questions[currentIndex];
  const totalQuestions = assessment.questions.length;
  const answeredCount = Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]).length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleReadQuestion = () => {
    const speechText = `Question ${currentIndex + 1}. ${currentQuestion.question_text}. Options: ${currentQuestion.options
      .map((o) => `Option ${o.key}: ${o.text}`)
      .join('. ')}`;
    speakText(speechText);
  };

  const handleFinalSubmit = async () => {
    if (!id) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    stopSpeaking();

    const answersPayload = assessment.questions.map((q) => ({
      question_id: q.id,
      selected_answer: selectedAnswers[q.id] || '',
    }));

    try {
      const result = await assessmentService.submitAttempt(id, {
        answers: answersPayload,
      });

      navigate(`/assessments/${id}/result`, {
        state: { result },
        replace: true,
      });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          'Failed to submit assessment answers. Please check your connection and try again.'
      );
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header & Meta */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">{assessment.subject}</Badge>
            <span className="text-xs text-surface-500 font-medium">Diagnostic Calibration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">{assessment.title}</h1>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="subtle"
            size="sm"
            onClick={handleReadQuestion}
            aria-label="Read active question aloud"
          >
            <span aria-hidden="true" className="mr-1.5">🔊</span>
            <span>Listen</span>
          </Button>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
            Answered: {answeredCount} / {totalQuestions}
          </div>
        </div>
      </header>

      {/* Progress Bar with ARIA */}
      <div className="space-y-1.5" role="region" aria-label="Assessment progress">
        <div className="flex justify-between text-xs text-surface-500 font-medium">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div
          className="w-full h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
        >
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Number Navigation Pills */}
      <nav aria-label="Question navigation grid" className="flex flex-wrap gap-1.5">
        {assessment.questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = !!selectedAnswers[q.id];

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                isCurrent
                  ? 'bg-brand-600 text-white shadow-xs'
                  : isAnswered
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </nav>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Active Question Card */}
      <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
          <span className="text-xs font-semibold uppercase text-surface-400 tracking-wider">
            Question #{currentQuestion.order_number || currentIndex + 1}
          </span>
          <Badge variant="neutral" size="sm">
            Difficulty: {currentQuestion.difficulty}
          </Badge>
        </div>

        <h2
          id="active-question-text"
          className="text-lg sm:text-xl font-medium text-surface-900 dark:text-white leading-relaxed"
        >
          {currentQuestion.question_text}
        </h2>

        {/* Accessible Options Radio Group */}
        <div
          className="space-y-3"
          role="radiogroup"
          aria-labelledby="active-question-text"
        >
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswers[currentQuestion.id] === option.key;

            return (
              <div
                key={option.key}
                onClick={() => handleSelectOption(option.key)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectOption(option.key);
                  }
                }}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 font-semibold ring-2 ring-brand-200 dark:ring-brand-800/80 shadow-sm'
                    : 'border-surface-200 dark:border-surface-750 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-surface-50 dark:hover:bg-surface-800/60 text-surface-800 dark:text-surface-200'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs mr-3.5 transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                  }`}
                  aria-hidden="true"
                >
                  {option.key}
                </div>
                <span className="text-sm font-medium flex-1">{option.text}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation Controls */}
      <footer className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isSubmitting}
          aria-label="Go to previous question"
        >
          ← Previous
        </Button>

        <div className="flex space-x-3">
          {currentIndex < totalQuestions - 1 ? (
            <Button variant="primary" onClick={handleNext} aria-label="Go to next question">
              Next Question →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowConfirmModal(true)}
              isLoading={isSubmitting}
              aria-label="Complete and submit baseline assessment"
            >
              Complete & Submit Assessment
            </Button>
          )}
        </div>
      </footer>

      {/* Accidental Submission Prevention Dialog */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-surface-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
        >
          <div className="bg-white dark:bg-surface-850 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-surface-200 dark:border-surface-750">
            <h3 id="confirm-submit-title" className="text-lg font-bold text-surface-900 dark:text-white">
              Submit Assessment?
            </h3>
            <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
              You have answered <span className="font-semibold text-brand-600 dark:text-brand-400">{answeredCount}</span> of{' '}
              <span className="font-semibold text-surface-900 dark:text-white">{totalQuestions}</span> questions.
              {answeredCount < totalQuestions && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Notice: You have {totalQuestions - answeredCount} unanswered question(s).
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-surface-100 dark:border-surface-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Review Answers
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
