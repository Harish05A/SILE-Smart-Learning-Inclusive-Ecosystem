import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearningPath } from '../../types/adaptive.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';


export const LearningPathPage: React.FC = () => {
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getLearningPaths();
      if (data.length > 0) {
        const inProgress = data.find((p) => p.status === 'in_progress') || data[0];
        setActivePath(inProgress);
      }
    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setError(err.message || 'Unable to load learning paths.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewPath = async () => {
    try {
      setGenerating(true);
      setError(null);
      const newPath = await adaptiveService.generateLearningPath();
      setActivePath(newPath);
    } catch (err: any) {
      console.error('Failed to generate path:', err);
      setError(err.message || 'Failed to generate new adaptive path.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-48 w-full rounded-2xl mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-surface-200 dark:border-surface-800 pb-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Personalized Progression
              </span>
              <Badge variant="brand" size="sm">Adaptive Pathway</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
              Learning Path
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              Topologically sequenced milestones dynamically generated from your diagnostic performance and gaps.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerateNewPath}
            disabled={generating}
            className="self-start sm:self-auto"
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Calibrating Milestones...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Adaptive Path
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {activePath ? (
        <div className="space-y-6 animate-fade-in">
          {/* Path Header & Progress Card */}
          <Card variant="elevated" className="p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="neutral" size="sm">
                    {activePath.subject_name || 'Mathematics'}
                  </Badge>
                  <Badge
                    variant={
                      activePath.status === 'completed'
                        ? 'success'
                        : activePath.status === 'in_progress'
                        ? 'brand'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {activePath.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mt-1">
                  {activePath.title}
                </h2>
                <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 mt-1">
                  {activePath.description}
                </p>
              </div>

              <div className="text-right sm:self-center">
                <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                  {activePath.progress_percentage}%
                </div>
                <div className="text-xs text-surface-500 font-medium">Path Completion</div>
              </div>
            </div>

            {/* Progress Bar & Stats */}
            <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <div className="flex justify-between text-xs font-medium text-surface-700 dark:text-surface-300">
                <span>
                  Completed {activePath.completed_items} of {activePath.total_items} sequential modules
                </span>
                <span>⏱️ Total ~{activePath.total_estimated_duration_minutes} mins</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${activePath.progress_percentage}%` }}
                ></div>
              </div>
            </div>
          </Card>

          {/* Ordered Learning Items Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-surface-900 dark:text-white">
                Curriculum Progression ({activePath.items.length} Milestones)
              </h3>
              <span className="text-xs text-surface-500">Target step-by-step sequencing</span>
            </div>

            <div className="space-y-3">
              {activePath.items.map((item) => {
                const isCompleted = item.status === 'completed';
                const isInProgress = item.status === 'in_progress';

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-surface-850 rounded-xl p-5 border transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
                      isInProgress
                        ? 'border-brand-500 dark:border-brand-600 shadow-md ring-2 ring-brand-100 dark:ring-brand-950'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-850/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-surface-200 dark:border-surface-800 opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number Bubble */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isInProgress
                            ? 'bg-brand-600 text-white shadow-sm ring-4 ring-brand-100 dark:ring-brand-900/50'
                            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          item.sequence_number
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-surface-500 uppercase">
                            {item.topic_name}
                          </span>
                          <Badge
                            variant={
                              item.difficulty === 'beginner'
                                ? 'success'
                                : item.difficulty === 'developing'
                                ? 'warning'
                                : item.difficulty === 'proficient'
                                ? 'brand'
                                : 'info'
                            }
                            size="sm"
                          >
                            {item.difficulty}
                          </Badge>
                          <span className="text-[11px] text-surface-400">
                            ⏱️ ~{item.estimated_duration_minutes} mins
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-surface-900 dark:text-surface-100">
                          {item.content_title}
                        </h4>

                        {isCompleted && item.completed_at && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400">
                            Completed on {new Date(item.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 self-end sm:self-auto">
                      <Button
                        variant={isInProgress ? 'primary' : isCompleted ? 'subtle' : 'secondary'}
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/content/${item.content_id}?path_id=${activePath.id}&item_id=${item.id}`
                          )
                        }
                      >
                        {isCompleted ? 'Review Lesson' : isInProgress ? 'Continue Lesson →' : 'Start Milestone'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No Learning Path Generated Yet"
          description="SILE analyzes your diagnostic baseline and mastery profile to build a custom step-by-step curriculum path."
          icon={
            <svg className="w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
          action={
            <Button
              variant="primary"
              onClick={handleGenerateNewPath}
              disabled={generating}
            >
              {generating ? 'Calibrating Milestones...' : 'Generate My Adaptive Path'}
            </Button>
          }
        />
      )}
    </div>
  );
};
