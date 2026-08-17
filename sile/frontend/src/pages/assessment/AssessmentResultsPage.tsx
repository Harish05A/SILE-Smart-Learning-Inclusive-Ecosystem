import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AssessmentAttemptResult } from '../../types/assessment.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const AssessmentResultsPage: React.FC = () => {
  const location = useLocation();
  const result = (location.state as any)?.result as AssessmentAttemptResult | undefined;

  if (!result) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">No Assessment Results Found</h2>
        <p className="text-sm text-slate-500">
          Please take or select an assessment to view diagnostic performance metrics.
        </p>
        <Link to="/assessments">
          <Button>View Assessments</Button>
        </Link>
      </div>
    );
  }

  const levelBadgeConfig = {
    Beginner: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      description: 'Foundational review and step-by-step scaffolds recommended.',
    },
    Developing: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Solid conceptual footing; ready for progressive practice modules.',
    },
    Proficient: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Strong mastery of foundational arithmetic, algebra, and geometry concepts.',
    },
  };

  const currentLevelConfig =
    levelBadgeConfig[result.learning_level] || levelBadgeConfig.Developing;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
            <span className="text-[11px] uppercase font-semibold text-emerald-700 tracking-wider">
              Diagnostic Complete
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Assessment Results</h1>
          <p className="text-xs text-slate-500 mt-1">{result.assessment_title}</p>
        </div>

        <Link to="/dashboard">
          <Button variant="primary" size="md">
            Return to Dashboard &rarr;
          </Button>
        </Link>
      </div>

      {/* Summary Score Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Score */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Total Score
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{result.score}</span>
            <span className="text-sm font-medium text-slate-400">/ {result.total_questions}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Questions answered correctly</span>
        </Card>

        {/* Percentage */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Percentage
          </span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-indigo-600">{result.percentage}%</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Overall diagnostic accuracy</span>
        </Card>

        {/* Correct Count */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Correct Answers
          </span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600">{result.correct_count}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Correct
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Verified accurate options</span>
        </Card>

        {/* Incorrect Count */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Incorrect / Skipped
          </span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-3xl font-extrabold text-rose-600">{result.incorrect_count}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Incorrect
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Identified for reinforcement</span>
        </Card>
      </div>

      {/* Learning Level Banner */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Assigned Learning Level
            </span>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-lg text-sm font-bold border ${currentLevelConfig.bg}`}
              >
                {result.learning_level}
              </span>
              <p className="text-xs text-slate-600">{currentLevelConfig.description}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Question Review */}
      {result.answers_summary && result.answers_summary.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Question-by-Question Review</h2>

          <div className="space-y-3">
            {result.answers_summary.map((item, idx) => (
              <Card
                key={item.question_id || idx}
                className={`p-4 border-l-4 ${
                  item.is_correct ? 'border-l-emerald-500' : 'border-l-rose-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      Question {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-900">{item.question_text}</p>
                    <div className="flex flex-wrap gap-4 text-xs pt-2">
                      <span className="text-slate-600">
                        Your Answer:{' '}
                        <span
                          className={`font-semibold ${
                            item.is_correct ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          Option {item.selected_answer || 'None'}
                        </span>
                      </span>
                      {!item.is_correct && (
                        <span className="text-slate-600">
                          Correct Answer:{' '}
                          <span className="font-semibold text-emerald-700">
                            Option {item.correct_answer}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      item.is_correct
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {item.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Dashboard CTA */}
      <div className="pt-6 border-t border-slate-200 flex justify-center">
        <Link to="/dashboard">
          <Button size="lg" className="px-8">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
