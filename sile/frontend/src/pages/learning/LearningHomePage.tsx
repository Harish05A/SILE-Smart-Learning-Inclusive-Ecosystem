import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { dashboardService } from '../../services/dashboard.service';
import {
  LearnerPerformanceOverview,
  LearningPath,
  RecommendationItem,
} from '../../types/adaptive.types';
import { DashboardOverviewData } from '../../types/dashboard.types';

export const LearningHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardOverviewData | null>(null);
  const [performance, setPerformance] = useState<LearnerPerformanceOverview | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        adaptiveService.getRecommendations(3),
        adaptiveService.getLearningPaths(),
      ]);

      setDashboard(dashData);
      setPerformance(perfData);
      setRecommendations(recData.recommendations || []);
      
      const inProgressPath = pathsData.find((p) => p.status === 'in_progress') || pathsData[0] || null;
      setActivePath(inProgressPath);
    } catch (err: any) {
      console.error('Failed to load learning home data:', err);
      setError(err.message || 'Unable to load adaptive learning dashboard. Please try again.');
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
      setError(err.message || 'Failed to generate learning path.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-2xl mx-auto my-8">
        <h2 className="text-lg font-semibold mb-2">Error Loading Learning Home</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={loadLearningData}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const topRecommendation = recommendations[0];
  const nextPathItem = activePath?.items.find((item) => item.status === 'in_progress') || activePath?.items.find((item) => item.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Welcome & Overall Status Banner */}
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              Phase 2 Adaptive Learning Engine
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {performance?.full_name || 'Learner'}!
            </h1>
            <p className="text-indigo-100 text-sm mt-1">
              Your personalized curriculum is calibrated to your unique mastery pace.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 self-start md:self-auto">
            <div className="text-right">
              <div className="text-xs text-indigo-200 font-medium">Assessed Level</div>
              <div className="text-lg font-bold text-white">
                {dashboard?.latest_assessment?.learning_level || 'Proficient'}
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
              🎯
            </div>
          </div>
        </div>
      </header>

      {/* Recommended Next Activity Spotlight */}
      {topRecommendation && (
        <section aria-labelledby="spotlight-heading" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-3">
            <span className="text-lg">⭐</span>
            <span id="spotlight-heading">Recommended Next Activity</span>
            <span className={`ml-auto px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
              topRecommendation.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              topRecommendation.priority === 'high' ? 'bg-amber-100 text-amber-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {topRecommendation.priority} Priority
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Topic: {topRecommendation.topic_name} • {topRecommendation.estimated_duration_minutes} mins • {topRecommendation.difficulty}
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {topRecommendation.content_title || 'Foundational Review Lesson'}
              </h3>
              <p className="text-sm text-slate-600 italic">
                "{topRecommendation.reason}"
              </p>
            </div>
            {topRecommendation.content_id && (
              <button
                onClick={() => navigate(`/content/${topRecommendation.content_id}`)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all flex-shrink-0"
              >
                Start Lesson →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Grid: Active Learning Path & Mastery Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Learning Path Column (2 cols) */}
        <section aria-labelledby="path-heading" className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 id="path-heading" className="text-lg font-bold text-slate-900">
                My Active Learning Path
              </h2>
              <p className="text-xs text-slate-500">
                {activePath?.title || 'Personalized Mathematics Mastery Path'}
              </p>
            </div>
            {activePath && (
              <span className="text-sm font-semibold text-indigo-600">
                {activePath.completed_items}/{activePath.total_items} Completed ({activePath.progress_percentage}%)
              </span>
            )}
          </div>

          {activePath ? (
            <>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${activePath.progress_percentage}%` }}
                ></div>
              </div>

              {/* Next Step Highlight Card */}
              {nextPathItem && (
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-700 uppercase">
                      Next Step #{nextPathItem.sequence_number}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-base">
                      {nextPathItem.content_title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {nextPathItem.topic_name} • {nextPathItem.estimated_duration_minutes} mins • {nextPathItem.difficulty}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/content/${nextPathItem.content_id}?path_id=${activePath.id}&item_id=${nextPathItem.id}`)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                  >
                    Continue →
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Link
                  to="/learning-path"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View Full Step-by-Step Path ({activePath.total_items} steps) →
                </Link>
                <button
                  onClick={handleGeneratePath}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Regenerate Path
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-slate-600">
                You don't have an active learning path yet.
              </p>
              <button
                onClick={handleGeneratePath}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md"
              >
                Generate My Personalized Path
              </button>
            </div>
          )}
        </section>

        {/* Topic Health & Weak Topics (1 col) */}
        <section aria-labelledby="weak-heading" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 id="weak-heading" className="text-lg font-bold text-slate-900">
            Target Focus Topics
          </h2>

          {performance?.weak_topics && performance.weak_topics.length > 0 ? (
            <div className="space-y-3">
              {performance.weak_topics.map((t) => (
                <div
                  key={t.topic_id}
                  className="p-3 bg-red-50/70 border border-red-100 rounded-xl"
                >
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-red-800 font-bold">{t.topic_name}</span>
                    <span className="text-red-700">{t.accuracy}% Acc</span>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-red-600 h-1.5 rounded-full"
                      style={{ width: `${t.mastery_percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-red-600 mt-1">
                    Needs reinforcement • {t.current_difficulty} level
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
              🎉 Outstanding! No weak topic gaps detected. All tested concepts are at developing or proficient level.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/performance"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between"
            >
              <span>View All 5 Topic Mastery Breakdown</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Quick Navigation Cards */}
      <section aria-label="Curriculum Shortcuts" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/subjects"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">📚</div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Curriculum Subjects</h3>
          <p className="text-xs text-slate-500 mt-1">Explore mathematics curriculum topics & skills</p>
        </Link>
        <Link
          to="/recommendations"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">💡</div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Recommendations</h3>
          <p className="text-xs text-slate-500 mt-1">Prioritized lessons based on your accuracy</p>
        </Link>
        <Link
          to="/learning-path"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">🗺️</div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Learning Path</h3>
          <p className="text-xs text-slate-500 mt-1">Step-by-step sequential lesson milestones</p>
        </Link>
        <Link
          to="/performance"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Mastery Analytics</h3>
          <p className="text-xs text-slate-500 mt-1">Topic-level accuracy and mastery indicators</p>
        </Link>
      </section>
    </div>
  );
};
