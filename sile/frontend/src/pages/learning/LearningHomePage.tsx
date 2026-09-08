import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adaptiveService } from '../../services/adaptive.service';
import { dashboardService } from '../../services/dashboard.service';
import { formatApiErrorMessage } from '../../services/api.client';
import {
  LearnerPerformanceOverview,
  LearningPath,
  RecommendationItem,
} from '../../types/adaptive.types';
import { DashboardOverviewData } from '../../types/dashboard.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton, NextStepHeroSkeleton, LessonCardSkeleton } from '../../components/ui/SkeletonLoader';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  Compass,
  Layers,
  CheckCircle2,
  BarChart2,
  BookOpen,
  Brain,
} from 'lucide-react';

export const LearningHomePage: React.FC = () => {
  const { user, logout } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardOverviewData | null>(null);
  const [performance, setPerformance] = useState<LearnerPerformanceOverview | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashData, perfData, recData, pathsData] = await Promise.all([
        dashboardService.getOverview(),
        adaptiveService.getPerformance(),
        adaptiveService.getRecommendations(4),
        adaptiveService.getLearningPaths(),
      ]);

      setDashboard(dashData);
      setPerformance(perfData);
      setRecommendations(recData.recommendations || []);

      const inProgressPath =
        pathsData.find((p) => p.status === 'in_progress') || pathsData[0] || null;
      setActivePath(inProgressPath);
    } catch (err: any) {
      console.error('Failed to load learning home data:', err);
      const isUnauthorized = err?.response?.status === 401;
      setIsAuthError(isUnauthorized);
      setError(
        isUnauthorized
          ? 'Your authentication session has expired. Please sign in again with your learner account.'
          : formatApiErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePath = async () => {
    try {
      setLoading(true);
      const newPath = await adaptiveService.generateLearningPath();
      setActivePath(newPath);
    } catch (err: any) {
      setError(formatApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <NextStepHeroSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LessonCardSkeleton />
          <LessonCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 rounded-3xl max-w-2xl mx-auto my-8 space-y-4">
        <h2 className="text-lg font-bold text-rose-900 dark:text-rose-100">
          {isAuthError ? 'Authentication Required' : 'Unable to Load Learning Dashboard'}
        </h2>
        <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
        <div className="flex items-center gap-3 pt-2">
          {isAuthError ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
            >
              Sign In Again →
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={loadLearningData}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }


  const topRecommendation = recommendations[0];
  const otherRecommendations = recommendations.slice(1);
  const pathItems = activePath?.items || [];
  const completedPathItems = pathItems.filter((i) => i.status === 'completed');
  const pathCompletionPct =
    pathItems.length > 0 ? Math.round((completedPathItems.length / pathItems.length) * 100) : 0;

  const getPriorityBadgeVariant = (priority: string) => {
    if (priority === 'urgent') return 'danger';
    if (priority === 'high') return 'warning';
    return 'brand';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* 1. Calm Human-Centered Welcome Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60">
              Personalized Learning Path
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {performance?.full_name || user?.learner_profile?.full_name || 'Learner'}
          </h1>


          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            SILE monitors your mastery trajectory and prepares step-by-step learning modules aligned with your pace.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/ai-tutor">
            <Button variant="subtle" size="sm" className="shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>AI Tutor</span>
            </Button>
          </Link>
          <Link to="/topics">
            <Button variant="outline" size="sm">
              <Compass className="w-3.5 h-3.5 text-slate-600" />
              <span>Explore</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Dominant Focal Point: "Your Next Step" Hero Card */}
      {topRecommendation ? (
        <section aria-labelledby="next-step-heading">
          <div className="bg-gradient-to-br from-brand-900 via-slate-900 to-brand-950 rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden border border-brand-800/40">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                    Your Next Step
                  </Badge>
                  <span className="text-xs text-slate-300 font-medium">
                    Topic: {topRecommendation.topic_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-brand-300" />
                  <span>~{topRecommendation.estimated_duration_minutes || 15} mins</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 id="next-step-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {topRecommendation.content_title || `Explore ${topRecommendation.topic_name}`}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {topRecommendation.reason ||
                    'This module is tailored to reinforce key skills and build conceptual confidence.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {topRecommendation.content_id ? (
                  <Link to={`/content/${topRecommendation.content_id}`}>
                    <Button
                      variant="primary"
                      size="md"
                      className="bg-brand-500 hover:bg-brand-400 text-white font-bold shadow-md"
                    >
                      <span>Continue Lesson</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/practice/${topRecommendation.topic_id}`}>
                    <Button
                      variant="primary"
                      size="md"
                      className="bg-brand-500 hover:bg-brand-400 text-white font-bold shadow-md"
                    >
                      <span>Start Practice</span>
                      <Zap className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}

                <Link
                  to={`/ai-tutor?topic_id=${topRecommendation.topic_id}${
                    topRecommendation.content_id ? `&content_id=${topRecommendation.content_id}` : ''
                  }`}
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <Sparkles className="w-4 h-4 text-brand-300 mr-1.5" />
                    <span>Adapt with AI Tutor</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900">Ready to begin learning?</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Generate your personalized learning path or explore curriculum topics.
              </p>
            </div>
            <Button variant="primary" onClick={handleGeneratePath}>
              Generate Learning Path
            </Button>
          </div>
        </Card>
      )}

      {/* 3. Learning Journey Progression Map */}
      <section aria-labelledby="journey-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <h2 id="journey-heading" className="text-base font-bold text-slate-900">
              Active Learning Journey
            </h2>
          </div>
          <Link
            to="/learning-path"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Full Path</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Card variant="default" padding="md" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">{activePath?.title || 'Foundational Path'}</span>
            <span>
              {completedPathItems.length} of {pathItems.length} milestones complete ({pathCompletionPct}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200"
            role="progressbar"
            aria-valuenow={pathCompletionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Learning path progress"
          >
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pathCompletionPct}%` }}
            />
          </div>

          {/* Milestone Step Previews */}
          {pathItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {pathItems.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                    item.status === 'completed'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : item.status === 'in_progress'
                      ? 'bg-brand-50/70 border-brand-200 text-brand-900 ring-1 ring-brand-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider">
                      Step {item.sequence_number}
                    </span>
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : item.status === 'in_progress' ? (
                      <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
                    ) : (
                      <span className="text-slate-400">⏱️</span>
                    )}
                  </div>
                  <p className="font-semibold truncate">{item.topic_name}</p>
                  <p className="text-[11px] opacity-80 capitalize">{item.status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              No active learning path items yet. Click &quot;Full Path&quot; to generate your roadmap.
            </p>
          )}
        </Card>
      </section>

      {/* 4. Progress Summary (3 Meaningful Indicators) */}
      <section aria-labelledby="progress-summary-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-brand-600" />
          <h2 id="progress-summary-heading" className="text-base font-bold text-slate-900">
            Progress & Understanding
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Overall Mastery Card */}
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Mastery
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {Math.round((performance?.overall_mastery || 0) * 100)}%
              </span>
              <Badge variant="brand" size="sm">
                {dashboard?.latest_assessment?.learning_level || 'Developing'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">Calculated across baseline & practice</p>
          </Card>

          {/* Topics Explored */}
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Concepts Explored
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {performance?.all_topics?.length || 5}
              </span>
              <span className="text-xs font-medium text-slate-500">Curriculum topics</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {performance?.strong_topics?.length || 0} strong • {performance?.developing_topics?.length || 0} developing
            </p>
          </Card>

          {/* Practice Questions Attempted */}
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Practice Questions
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {performance?.total_questions_attempted || 0}
              </span>
              <span className="text-xs font-medium text-slate-500">
                ({Math.round(performance?.overall_accuracy || 0)}% accuracy)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Adaptive calibrated practice questions</p>
          </Card>
        </div>
      </section>

      {/* 5. Continue Learning & Recommended Modules */}
      {otherRecommendations.length > 0 && (
        <section aria-labelledby="recommended-modules-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="recommended-modules-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span>Recommended Next Topics</span>
            </h2>
            <Link
              to="/recommendations"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherRecommendations.map((rec) => (
              <Card key={rec.id} variant="interactive" padding="md" className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={getPriorityBadgeVariant(rec.priority)} size="sm">
                      {rec.priority} priority
                    </Badge>
                    <span className="text-xs text-slate-400">⏱️ ~{rec.estimated_duration_minutes}m</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{rec.topic_name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>


                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500 capitalize">{rec.difficulty} difficulty</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/practice/${rec.topic_id}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Practice ➔
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 6. Contextual AI Tutor Invitation Card */}
      <section aria-labelledby="ai-support-heading">
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-300">
              <Brain className="w-4 h-4 text-brand-400" />
              <span id="ai-support-heading">Multi-Agent AI Tutor</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Need a personalized breakdown or step-by-step example?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              SILE adapts explanations, designs worked examples, and synthesizes formative checkpoints for any topic.
            </p>
          </div>

          <Link to="/ai-tutor" className="flex-shrink-0 self-stretch sm:self-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>Launch AI Tutor</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
