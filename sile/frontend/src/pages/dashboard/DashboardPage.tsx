import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboard.service';
import { adaptiveService } from '../../services/adaptive.service';
import { DashboardOverviewData } from '../../types/dashboard.types';
import {
  LearnerPerformanceOverview,
  LearningPath,
  RecommendationItem,
} from '../../types/adaptive.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardOverviewData | null>(null);
  const [performance, setPerformance] = useState<LearnerPerformanceOverview | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [dashRes, perfRes, recRes, pathsRes] = await Promise.all([
          dashboardService.getOverview(),
          adaptiveService.getPerformance().catch(() => null),
          adaptiveService.getRecommendations(3).catch(() => ({ total: 0, recommendations: [] })),
          adaptiveService.getLearningPaths().catch(() => []),
        ]);

        if (isMounted) {
          setDashboardData(dashRes);
          setPerformance(perfRes);
          setRecommendations(recRes.recommendations || []);
          const inProgress = pathsRes.find((p) => p.status === 'in_progress') || pathsRes[0] || null;
          setActivePath(inProgress);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.error?.message ||
              'Unable to load dashboard data from server. Please refresh or try again later.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[450px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading real-time adaptive learner dashboard..." />
      </div>
    );
  }

  const learnerName =
    dashboardData?.full_name ||
    performance?.full_name ||
    user?.learner_profile?.full_name ||
    user?.email ||
    'Learner';

  const completionPct = dashboardData?.profile_completion_percentage ?? 50;
  const currentLearningLevel =
    dashboardData?.latest_assessment?.learning_level ||
    (performance?.overall_mastery && performance.overall_mastery >= 70 ? 'Proficient' : 'Developing');

  const topRec = recommendations[0];
  const nextPathItem =
    activePath?.items.find((item) => item.status === 'in_progress') ||
    activePath?.items.find((item) => item.status === 'pending');

  const levelBadgeConfig: Record<string, string> = {
    Beginner: 'bg-blue-50 text-blue-800 border-blue-200',
    Developing: 'bg-amber-50 text-amber-800 border-amber-200',
    Proficient: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Advanced: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  // Continue Learning Action Target
  const handleContinueLearning = () => {
    if (nextPathItem && activePath) {
      navigate(`/content/${nextPathItem.content_id}?path_id=${activePath.id}&item_id=${nextPathItem.id}`);
    } else if (topRec?.content_id) {
      navigate(`/content/${topRec.content_id}`);
    } else {
      navigate('/practice');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {/* 1. Welcome & Primary Continue Learning Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="text-[11px] uppercase font-bold text-indigo-300 tracking-wider">
                Phase 2 Adaptive Learning Engine Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {learnerName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Your learning path is continuously adapted based on diagnostic assessments and practice performance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleContinueLearning}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Continue Learning</span>
              <span>→</span>
            </button>
            <Link to="/practice">
              <button className="w-full sm:w-auto px-4 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-xs transition-all">
                ⚡ Adaptive Practice
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Adaptive Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Learning Level */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Learning Level
          </div>
          <div className="my-2">
            <span
              className={`inline-block px-3 py-1 rounded-xl text-sm font-bold border ${
                levelBadgeConfig[currentLearningLevel] || 'bg-slate-100 text-slate-800'
              }`}
            >
              {currentLearningLevel}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Calibrated from baseline & practice
          </div>
        </div>

        {/* Metric 2: Overall Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Overall Progress
          </div>
          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
              {activePath ? `${activePath.progress_percentage}%` : `${performance?.overall_mastery || 0}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{
                width: `${activePath ? activePath.progress_percentage : performance?.overall_mastery || 0}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Recent Practice Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Practice Performance
          </div>
          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {performance?.overall_accuracy ?? 0}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Across {performance?.total_questions_attempted ?? 0} diagnostic attempts
          </div>
        </div>

        {/* Metric 4: Topic Mastery Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Concept Health
          </div>
          <div className="my-2 flex items-center gap-2 text-xs font-bold">
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
              {performance?.weak_topics.length ?? 0} Weak
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
              {performance?.developing_topics.length ?? 0} Dev
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
              {performance?.strong_topics.length ?? 0} Strong
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {performance?.all_topics.length ?? 5} Topics Tracked
          </div>
        </div>
      </div>

      {/* 3. Recommended Next Activity Spotlight with Interactive Explainability */}
      {topRec && (
        <section aria-labelledby="rec-heading" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h2 id="rec-heading" className="text-lg font-bold text-slate-900">
                Recommended Next Activity
              </h2>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
              topRec.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              topRec.priority === 'high' ? 'bg-amber-100 text-amber-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {topRec.priority} Priority
            </span>
          </div>

          <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                Topic: {topRec.topic_name} • {topRec.estimated_duration_minutes} mins • Level: {topRec.difficulty}
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {topRec.content_title || 'Targeted Mastery Module'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                {topRec.reason}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {topRec.content_id && (
                <button
                  onClick={() => navigate(`/content/${topRec.content_id}`)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                >
                  Start Lesson →
                </button>
              )}
            </div>
          </div>

          {/* Interactive Explainability Section: "Why am I seeing this recommendation?" */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowExplanation((prev) => !prev)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 focus:outline-none"
            >
              <span>{showExplanation ? '▼' : '▶'}</span>
              <span>Why am I seeing this recommendation?</span>
            </button>

            {showExplanation && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2 animate-fadeIn">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Deterministic Rule-Based Rationale:</span>
                </div>
                <p className="leading-relaxed">
                  "You are seeing this recommendation because your current{' '}
                  <strong>{topRec.topic_name}</strong> mastery score was evaluated. The system
                  selected <strong>{topRec.difficulty}</strong>-level learning content to reinforce
                  prerequisite principles and improve your performance before advancing."
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
                  <span>• Rule Applied: Priority-Weighted Accuracy Gap</span>
                  <span>• Content Calibrated: {topRec.difficulty}</span>
                  <span>• Explainability: Pure Deterministic Logic (No LLMs)</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Active Learning Path & Weak/Strong Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Active Learning Path */}
        <section aria-labelledby="path-heading" className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 id="path-heading" className="text-lg font-bold text-slate-900">
                Current Learning Path
              </h2>
              <p className="text-xs text-slate-500">
                {activePath?.title || 'Personalized Mathematics Mastery Path'}
              </p>
            </div>
            {activePath && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {activePath.completed_items}/{activePath.total_items} Completed ({activePath.progress_percentage}%)
              </span>
            )}
          </div>

          {activePath ? (
            <div className="space-y-4">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${activePath.progress_percentage}%` }}
                ></div>
              </div>

              {nextPathItem && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">
                      Current Milestone Step #{nextPathItem.sequence_number}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {nextPathItem.content_title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {nextPathItem.topic_name} • {nextPathItem.estimated_duration_minutes} mins • {nextPathItem.difficulty}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/content/${nextPathItem.content_id}?path_id=${activePath.id}&item_id=${nextPathItem.id}`
                      )
                    }
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex-shrink-0"
                  >
                    Continue Step →
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Link
                  to="/learning-path"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View Full Step-by-Step Path ({activePath.total_items} items) →
                </Link>
                <Link
                  to="/practice"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Start Topic Practice ⚡
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl space-y-3">
              <p className="text-xs text-slate-600">No active path generated yet.</p>
              <Link to="/learning-path">
                <Button size="sm">Generate Learning Path</Button>
              </Link>
            </div>
          )}
        </section>

        {/* Column 3: Weak & Strong Topics Summary */}
        <section aria-labelledby="mastery-summary-heading" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 id="mastery-summary-heading" className="text-lg font-bold text-slate-900">
            Topic Mastery Focus
          </h2>

          {/* Weak Topics */}
          {performance?.weak_topics && performance.weak_topics.length > 0 ? (
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-red-600 tracking-wider">
                Weak Topics (Needs Focus)
              </div>
              {performance.weak_topics.map((t) => (
                <div
                  key={t.topic_id}
                  className="p-3 bg-red-50/70 border border-red-100 rounded-xl space-y-1"
                >
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-red-900">{t.topic_name}</span>
                    <span className="text-red-700">{t.accuracy}% Acc</span>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-red-600 h-1.5 rounded-full"
                      style={{ width: `${t.mastery_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-red-600 pt-0.5">
                    <span>{t.current_difficulty} level</span>
                    <Link
                      to={`/practice?topic_id=${t.topic_id}`}
                      className="font-bold underline text-red-800"
                    >
                      Practice ⚡
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Strong Topics */}
          {performance?.strong_topics && performance.strong_topics.length > 0 ? (
            <div className="space-y-2.5 pt-2">
              <div className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider">
                Strong Topics (Mastered)
              </div>
              {performance.strong_topics.map((t) => (
                <div
                  key={t.topic_id}
                  className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1"
                >
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-900">{t.topic_name}</span>
                    <span className="text-emerald-700">{t.mastery_percentage}% Mastery</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${t.mastery_percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/performance"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex justify-between items-center"
            >
              <span>View All 5 Topic Mastery Breakdown</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Phase 1 Profile, Baseline Assessment & Preferences Cards (Preserved) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Completion Card */}
        <Card className="flex flex-col justify-between p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Profile Completion
              </span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {completionPct}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 pt-1">
              <div className="flex items-center justify-between">
                <span>Account Email:</span>
                <span className="font-medium text-slate-800">{dashboardData?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Grade / Level:</span>
                <span className="font-medium text-slate-800">
                  {dashboardData?.profile.grade || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Language:</span>
                <span className="font-medium text-slate-800 uppercase">
                  {dashboardData?.profile.preferred_language || 'EN'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link to="/profile" className="w-full block">
              <Button variant="outline" size="sm" className="w-full">
                Edit Profile &rarr;
              </Button>
            </Link>
          </div>
        </Card>

        {/* Baseline Assessment Card */}
        <Card className="lg:col-span-2 flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Baseline Diagnostic Assessment
              </span>
              {dashboardData?.baseline_status === 'completed' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Completed
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending Baseline
                </span>
              )}
            </div>

            {dashboardData?.latest_assessment ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {dashboardData.latest_assessment.subject}: {dashboardData.latest_assessment.assessment_title}
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Completed on {new Date(dashboardData.latest_assessment.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${
                      levelBadgeConfig[dashboardData.latest_assessment.learning_level] || 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    Level: {dashboardData.latest_assessment.learning_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 block">Score</span>
                    <span className="text-xl font-bold text-slate-900">
                      {dashboardData.latest_assessment.score} / {dashboardData.latest_assessment.total_questions}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 block">Percentage</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {dashboardData.latest_assessment.percentage}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-slate-500 block">Readiness</span>
                    <span className="text-sm font-semibold text-slate-800 capitalize">
                      {dashboardData.latest_assessment.learning_level}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Foundational Mathematics Diagnostic</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Take the foundational assessment to automatically tailor difficulty and curriculum recommendations.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <Link
              to={dashboardData?.active_assessment_id ? `/assessments/${dashboardData.active_assessment_id}` : '/assessments'}
              className="flex-1"
            >
              <Button size="sm" className="w-full">
                {dashboardData?.latest_assessment ? 'Retake Assessment' : 'Take Baseline Assessment'}
              </Button>
            </Link>
            {dashboardData?.latest_assessment && (
              <Link to="/assessments" className="flex-1 sm:flex-initial">
                <Button variant="outline" size="sm" className="w-full">
                  View All Assessments
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Learning & Accessibility Preferences Cards (Preserved) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Learning Preferences</h2>
            <Link to="/preferences" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Customize &rarr;
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Learning Pace:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {dashboardData?.profile.learning_pace || 'Moderate'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Content Preference:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {dashboardData?.profile.preferred_content_type || 'Mixed'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Step-by-step explanations:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.learning_preferences.step_by_step ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.learning_preferences.step_by_step ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Visual explanations:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.learning_preferences.visual_explanations ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.learning_preferences.visual_explanations ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Short learning sessions:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.learning_preferences.short_sessions ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.learning_preferences.short_sessions ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Accessibility Accommodations</h2>
            <Link to="/preferences" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Configure &rarr;
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Large Text Mode:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.accessibility_preferences.large_text ? 'text-indigo-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.accessibility_preferences.large_text ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">High Contrast:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.accessibility_preferences.high_contrast ? 'text-indigo-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.accessibility_preferences.high_contrast ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Text-to-Speech Ready:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.accessibility_preferences.text_to_speech ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {dashboardData?.accessibility_preferences.text_to_speech ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Reduced Visual Complexity:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.accessibility_preferences.reduced_visual_complexity
                    ? 'text-indigo-700'
                    : 'text-slate-400'
                }`}
              >
                {dashboardData?.accessibility_preferences.reduced_visual_complexity ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Keyboard Navigation:</span>
              <span
                className={`font-semibold ${
                  dashboardData?.accessibility_preferences.keyboard_navigation
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {dashboardData?.accessibility_preferences.keyboard_navigation ? 'Enhanced' : 'Standard'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 7. Diagnostic Assessment History (Preserved) */}
      {dashboardData?.assessment_history && dashboardData.assessment_history.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Diagnostic Assessment History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past assessment attempts and assigned baseline levels.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {dashboardData.assessment_history.length} Attempt(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Subject & Title</th>
                  <th className="py-2.5 px-3 font-semibold">Date Completed</th>
                  <th className="py-2.5 px-3 font-semibold">Score</th>
                  <th className="py-2.5 px-3 font-semibold">Percentage</th>
                  <th className="py-2.5 px-3 font-semibold">Learning Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData.assessment_history.map((att) => (
                  <tr key={att.attempt_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {att.subject}: {att.assessment_title}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(att.completed_at).toLocaleDateString()} {new Date(att.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {att.score} / {att.total_questions}
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-600">
                      {att.percentage}%
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                          levelBadgeConfig[att.learning_level] || 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {att.learning_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
