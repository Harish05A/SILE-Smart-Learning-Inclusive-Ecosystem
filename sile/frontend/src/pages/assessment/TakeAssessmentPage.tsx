import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessment.service';
import { AssessmentDetail } from '../../types/assessment.types';
import { useAccessibility } from '../../hooks/useAccessibility';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

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
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading assessment questions..." />
      </div>
    );
  }

  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <ErrorMessage message={errorMessage || 'Assessment questions not found.'} />
        <Button onClick={() => navigate('/assessments')}>Back to Assessments</Button>
      </div>
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header & Meta */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs uppercase font-semibold text-indigo-600 tracking-wider">
            {assessment.subject} Baseline Diagnostic
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{assessment.title}</h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleReadQuestion}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center space-x-1 focus-visible:ring-2 focus-visible:ring-indigo-600"
            title="Read question aloud"
            aria-label="Read active question aloud"
          >
            <span aria-hidden="true">🔊</span>
            <span>Listen</span>
          </button>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
            Answered: {answeredCount} / {totalQuestions}
          </div>
        </div>
      </header>

      {/* Progress Bar with ARIA */}
      <div className="space-y-1.5" role="region" aria-label="Assessment progress">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div
          className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
        >
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
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
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isAnswered
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </nav>

      <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {/* Active Question Card with Live Region */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Question {currentQuestion.order_number || currentIndex + 1}
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded capitalize bg-slate-100 text-slate-600 font-medium">
            Difficulty: {currentQuestion.difficulty}
          </span>
        </div>

        <h2
          id="active-question-text"
          className="text-lg sm:text-xl font-medium text-slate-900 leading-relaxed"
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
                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs mr-3.5 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                  aria-hidden="true"
                >
                  {option.key}
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1">{option.text}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation Controls */}
      <footer className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isSubmitting}
          aria-label="Go to previous question"
        >
          &larr; Previous
        </Button>

        <div className="flex space-x-3">
          {currentIndex < totalQuestions - 1 ? (
            <Button onClick={handleNext} aria-label="Go to next question">
              Next Question &rarr;
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 id="confirm-submit-title" className="text-lg font-bold text-slate-900">
              Submit Assessment?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have answered <span className="font-semibold text-indigo-600">{answeredCount}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalQuestions}</span> questions.
              {answeredCount < totalQuestions && (
                <span className="block mt-2 text-amber-700 font-medium">
                  Warning: You have {totalQuestions - answeredCount} unanswered question(s). Unanswered questions will be scored as incorrect.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
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
