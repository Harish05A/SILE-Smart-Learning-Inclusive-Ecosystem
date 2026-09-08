import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AssessmentAttemptResult } from '../../types/assessment.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const AssessmentResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as any)?.result as AssessmentAttemptResult | undefined;

  if (!result) {
    return (
      <EmptyState
        title="No Assessment Results Found"
        description="Please select or complete an assessment to view your diagnostic performance metrics."
        action={
          <Button variant="primary" onClick={() => navigate('/assessments')}>
            View Assessments
          </Button>
        }
      />
    );
  }

  const levelBadgeConfig: Record<string, { variant: 'brand' | 'success' | 'warning' | 'info'; description: string }> = {
    Beginner: {
      variant: 'info',
      description: 'Foundational review and step-by-step scaffolds recommended.',
    },
    Developing: {
      variant: 'warning',
      description: 'Solid conceptual footing; ready for progressive practice modules.',
    },
    Proficient: {
      variant: 'success',
      description: 'Strong mastery of foundational arithmetic, algebra, and geometry concepts.',
    },
  };

  const currentLevelConfig =
    levelBadgeConfig[result.learning_level] || levelBadgeConfig.Developing;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="success" size="sm">Diagnostic Complete</Badge>
            <span className="text-xs text-surface-500 font-medium">Readiness Profile Updated</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">Assessment Results</h1>
          <p className="text-xs text-surface-500 mt-1">{result.assessment_title}</p>
        </div>

        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to Learner Home →
        </Button>
      </div>

      {/* Summary Score Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Score */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-surface-500 tracking-wider">
            Total Score
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-surface-900 dark:text-white">{result.score}</span>
            <span className="text-sm font-medium text-surface-400">/ {result.total_questions}</span>
          </div>
          <span className="text-[11px] text-surface-500 mt-2">Questions answered correctly</span>
        </Card>

        {/* Percentage */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-surface-500 tracking-wider">
            Percentage
          </span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">{result.percentage}%</span>
          </div>
          <span className="text-[11px] text-surface-500 mt-2">Diagnostic baseline accuracy</span>
        </Card>

        {/* Correct Count */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-surface-500 tracking-wider">
            Correct Answers
          </span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{result.correct_count}</span>
            <Badge variant="success" size="sm">Verified</Badge>
          </div>
          <span className="text-[11px] text-surface-500 mt-2">Accurate concept demonstrations</span>
        </Card>

        {/* Incorrect Count */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-surface-500 tracking-wider">
            Reinforcement Areas
          </span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{result.incorrect_count}</span>
            <Badge variant="danger" size="sm">Focus</Badge>
          </div>
          <span className="text-[11px] text-surface-500 mt-2">Targeted for adaptive scaffolding</span>
        </Card>
      </div>

      {/* Learning Level Banner */}
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase text-surface-500 tracking-wider">
              Calibrated Readiness Level
            </span>
            <div className="flex items-center space-x-3 mt-1">
              <Badge variant={currentLevelConfig.variant} size="md">
                {result.learning_level}
              </Badge>
              <p className="text-xs text-surface-600 dark:text-surface-400">{currentLevelConfig.description}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Question Review */}
      {result.answers_summary && result.answers_summary.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white px-1">
            Question-by-Question Review ({result.answers_summary.length})
          </h2>

          <div className="space-y-3">
            {result.answers_summary.map((item, idx) => (
              <div
                key={item.question_id || idx}
                className={`p-5 rounded-xl border ${
                  item.is_correct
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-850/60'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-850/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-surface-400 uppercase">
                      Question {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{item.question_text}</p>
                    <div className="flex flex-wrap gap-4 text-xs pt-2">
                      <span className="text-surface-600 dark:text-surface-400">
                        Your Answer:{' '}
                        <span
                          className={`font-semibold ${
                            item.is_correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          Option {item.selected_answer || 'None'}
                        </span>
                      </span>
                      {!item.is_correct && (
                        <span className="text-surface-600 dark:text-surface-400">
                          Correct Answer:{' '}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Option {item.correct_answer}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant={item.is_correct ? 'success' : 'danger'} size="sm">
                    {item.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Dashboard CTA */}
      <div className="pt-6 border-t border-surface-200 dark:border-surface-800 flex justify-center">
        <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
          Continue to Personalized Learning Path →
        </Button>
      </div>
    </div>
  );
};
