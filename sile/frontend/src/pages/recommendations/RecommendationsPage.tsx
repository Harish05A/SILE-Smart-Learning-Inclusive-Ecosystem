import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { RecommendationItem } from '../../types/adaptive.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';


export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getRecommendations(10);
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error('Failed to load recommendations:', err);
      setError(err.message || 'Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl max-w-2xl mx-auto my-8 space-y-3">
        <h2 className="text-base font-bold text-red-800 dark:text-red-200">Error Loading Recommendations</h2>
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        <Button variant="danger" size="sm" onClick={loadRecommendations}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-surface-200 dark:border-surface-800 pb-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Diagnostic Gaps & Growth
              </span>
              <Badge variant="brand" size="sm">Adaptive Engine</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
              Personalized Recommendations
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              Deterministic, rule-based lessons prioritized to reinforce gaps and accelerate concept mastery.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            ← Back to Home
          </Button>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-4 animate-fade-in">
          {recommendations.map((rec, idx) => (
            <Card
              key={rec.id || idx}
              variant="interactive"
              className="p-6 transition-all flex flex-col md:flex-row justify-between md:items-center gap-6"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    {rec.topic_name}
                  </Badge>
                  <Badge
                    variant={
                      rec.priority === 'urgent'
                        ? 'danger'
                        : rec.priority === 'high'
                        ? 'warning'
                        : rec.priority === 'medium'
                        ? 'brand'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {rec.priority} Priority
                  </Badge>
                  <Badge
                    variant={
                      rec.difficulty === 'beginner'
                        ? 'success'
                        : rec.difficulty === 'developing'
                        ? 'warning'
                        : rec.difficulty === 'proficient'
                        ? 'brand'
                        : 'info'
                    }
                    size="sm"
                  >
                    {rec.difficulty}
                  </Badge>
                  <span className="text-xs text-surface-500 font-medium ml-auto md:ml-0">
                    ⏱️ ~{rec.estimated_duration_minutes} mins
                  </span>
                </div>

                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  {rec.content_title || 'Targeted Concept Mastery Module'}
                </h2>

                <div className="p-3 bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-750 rounded-lg text-xs text-surface-700 dark:text-surface-300">
                  <span className="font-semibold text-surface-900 dark:text-white">Why recommended: </span>
                  <span className="italic">{rec.reason}</span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {rec.content_id ? (
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/content/${rec.content_id}`)}
                    className="w-full md:w-auto"
                  >
                    Start Lesson →
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/topics')}
                    className="w-full md:w-auto"
                  >
                    View Topic Skills
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Pending Recommendations"
          description="You are caught up! Take a diagnostic assessment or practice a topic to discover new areas for reinforcement."
          action={
            <Button variant="primary" onClick={() => navigate('/assessments')}>
              Go to Assessments
            </Button>
          }
        />
      )}
    </div>
  );
};
