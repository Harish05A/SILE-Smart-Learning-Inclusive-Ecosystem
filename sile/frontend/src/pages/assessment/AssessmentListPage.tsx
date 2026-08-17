import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentService } from '../../services/assessment.service';
import { AssessmentListItem } from '../../types/assessment.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export const AssessmentListPage: React.FC = () => {
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
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading baseline assessments..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
          <span className="text-[11px] uppercase font-semibold text-indigo-700 tracking-wider">
            Phase 1 Diagnostic
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Baseline Assessments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Evaluate foundational knowledge in core subjects to help SILE adapt difficulty and recommend focus areas.
        </p>
      </div>

      {/* Non-medical purpose disclaimer */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-3">
        <svg
          className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5"
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
          <span className="font-semibold text-slate-800">Supportive & Non-Judgmental: </span>
          This assessment is untimed and solely establishes starting content difficulty. It is not used to diagnose
          disabilities, medical conditions, or label your intelligence.
        </div>
      </div>

      <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {/* Assessment List */}
      <div className="space-y-4">
        {assessments.map((item) => (
          <Card key={item.id} className="p-6 hover:border-indigo-200 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {item.subject}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs font-medium text-slate-600">
                    {item.total_questions} Multiple Choice Questions
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {item.description || 'Foundational readiness assessment for personalized pacing.'}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Arithmetic', 'Fractions', 'Percentages', 'Algebra', 'Geometry', 'Patterns'].map(
                    (topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]"
                      >
                        {topic}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="sm:flex-shrink-0">
                <Link to={`/assessments/${item.id}`}>
                  <Button size="md" className="w-full sm:w-auto">
                    Start Assessment &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {assessments.length === 0 && !errorMessage && (
          <Card className="text-center py-12">
            <p className="text-sm text-slate-500">No baseline assessments found at this time.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
