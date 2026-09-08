import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessment.service';
import { AssessmentListItem } from '../../types/assessment.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';


export const AssessmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAssessments = async () => {
      try {
        const data = await assessmentService.listAssessments();
        if (isMounted) {
          setAssessments(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.error?.message ||
              'Unable to load baseline diagnostic assessments from server.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAssessments();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="border-b border-surface-200 dark:border-surface-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Diagnostic Readiness
          </span>
          <Badge variant="brand" size="sm">Baseline Assessment</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
          Baseline Assessments
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Evaluate foundational knowledge in core subjects to help SILE calibrate starting difficulty and recommend target modules.
        </p>
      </div>

      {/* Non-medical purpose disclaimer */}
      <div className="p-4 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-xs text-surface-600 dark:text-surface-400 flex items-start space-x-3">
        <svg
          className="h-5 w-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <span className="font-semibold text-surface-900 dark:text-white">Supportive & Untimed: </span>
          This assessment solely establishes starting content difficulty. It is not used to diagnose
          disabilities, medical conditions, or label intelligence.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Assessment List */}
      <div className="space-y-4">
        {assessments.map((item) => (
          <Card key={item.id} variant="interactive" className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="brand" size="sm">{item.subject}</Badge>
                  <span className="text-xs text-surface-400">&bull;</span>
                  <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
                    {item.total_questions} Diagnostic Questions
                  </span>
                </div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">{item.title}</h2>
                <p className="text-xs text-surface-600 dark:text-surface-400 max-w-2xl leading-relaxed">
                  {item.description || 'Foundational readiness assessment for personalized pacing and scaffolding.'}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Arithmetic', 'Fractions', 'Percentages', 'Algebra', 'Geometry', 'Patterns'].map(
                    (topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded text-[11px]"
                      >
                        {topic}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="sm:flex-shrink-0">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/assessments/${item.id}`)}
                  className="w-full sm:w-auto"
                >
                  Start Assessment →
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {assessments.length === 0 && !errorMessage && (
          <EmptyState
            title="No Baseline Assessments Found"
            description="Diagnostic assessments will appear here when configured for your curriculum track."
          />
        )}
      </div>
    </div>
  );
};
