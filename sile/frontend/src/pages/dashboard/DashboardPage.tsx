import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboard.service';
import { DashboardOverviewData } from '../../types/dashboard.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const overview = await dashboardService.getOverview();
        if (isMounted) {
          setData(overview);
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

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[450px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading real-time learner dashboard..." />
      </div>
    );
  }

  const learnerName = data?.full_name || user?.learner_profile?.full_name || user?.email || 'Learner';
  const completionPct = data?.profile_completion_percentage ?? 50;

  const levelBadgeConfig: Record<string, string> = {
    Beginner: 'bg-blue-50 text-blue-800 border-blue-200',
    Developing: 'bg-amber-50 text-amber-800 border-amber-200',
    Proficient: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {/* 1. Welcome Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              <span className="text-[11px] uppercase font-semibold text-indigo-700 tracking-wider">
                Phase 1 Learner Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {learnerName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your personalized, inclusive learning workspace is synchronized with real backend diagnostics.
            </p>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/profile">
              <Button variant="outline" size="sm">
                Complete Profile
              </Button>
            </Link>
            <Link to={data?.active_assessment_id ? `/assessments/${data.active_assessment_id}` : '/assessments'}>
              <Button variant="primary" size="sm">
                Take Assessment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Completion & Baseline Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Learner Profile Completion Card */}
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

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 pt-1">
              <div className="flex items-center justify-between">
                <span>Account Email:</span>
                <span className="font-medium text-slate-800">{data?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Grade / Level:</span>
                <span className="font-medium text-slate-800">
                  {data?.profile.grade || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Language:</span>
                <span className="font-medium text-slate-800 uppercase">
                  {data?.profile.preferred_language || 'EN'}
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

        {/* 5, 6, 7, 8. Baseline Assessment Card */}
        <Card className="lg:col-span-2 flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Baseline Diagnostic Assessment
              </span>
              {data?.baseline_status === 'completed' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Completed
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending Baseline
                </span>
              )}
            </div>

            {data?.latest_assessment ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {data.latest_assessment.subject}: {data.latest_assessment.assessment_title}
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Completed on {new Date(data.latest_assessment.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${
                      levelBadgeConfig[data.latest_assessment.learning_level] || 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    Level: {data.latest_assessment.learning_level}
                  </span>
                </div>

                {/* Score Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 block">Score</span>
                    <span className="text-xl font-bold text-slate-900">
                      {data.latest_assessment.score} / {data.latest_assessment.total_questions}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 block">Percentage</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {data.latest_assessment.percentage}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-slate-500 block">Readiness</span>
                    <span className="text-sm font-semibold text-slate-800 capitalize">
                      {data.latest_assessment.learning_level}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Foundational Mathematics Diagnostic</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You haven't completed the baseline assessment yet. Take 10 untimed multiple-choice
                  questions in arithmetic, algebra, geometry, and pattern recognition so SILE can tailor
                  its difficulty.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <Link
              to={data?.active_assessment_id ? `/assessments/${data.active_assessment_id}` : '/assessments'}
              className="flex-1"
            >
              <Button size="sm" className="w-full">
                {data?.latest_assessment ? 'Retake Assessment' : 'Take Baseline Assessment'}
              </Button>
            </Link>
            {data?.latest_assessment && (
              <Link to="/assessments" className="flex-1 sm:flex-initial">
                <Button variant="outline" size="sm" className="w-full">
                  View All Assessments
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Second Grid: Learning Profile & Accessibility Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Learning Preferences Summary Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Learning Profile & Preferences</h2>
            <Link to="/profile" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Customize &rarr;
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Learning Pace:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {data?.profile.learning_pace || 'Moderate'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Content Preference:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {data?.profile.preferred_content_type || 'Mixed'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Step-by-step explanations:</span>
              <span
                className={`font-semibold ${
                  data?.learning_preferences.step_by_step ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {data?.learning_preferences.step_by_step ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Visual explanations:</span>
              <span
                className={`font-semibold ${
                  data?.learning_preferences.visual_explanations ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {data?.learning_preferences.visual_explanations ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Simplified language:</span>
              <span
                className={`font-semibold ${
                  data?.learning_preferences.simplified_language ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {data?.learning_preferences.simplified_language ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Short learning sessions:</span>
              <span
                className={`font-semibold ${
                  data?.learning_preferences.short_sessions ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {data?.learning_preferences.short_sessions ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>

        {/* 4. Accessibility Preferences Summary Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Accessibility Accommodations</h2>
            <Link to="/profile" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Configure &rarr;
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Large Text Mode:</span>
              <span
                className={`font-semibold ${
                  data?.accessibility_preferences.large_text ? 'text-indigo-700' : 'text-slate-400'
                }`}
              >
                {data?.accessibility_preferences.large_text ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">High Contrast:</span>
              <span
                className={`font-semibold ${
                  data?.accessibility_preferences.high_contrast ? 'text-indigo-700' : 'text-slate-400'
                }`}
              >
                {data?.accessibility_preferences.high_contrast ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Text-to-Speech Ready:</span>
              <span
                className={`font-semibold ${
                  data?.accessibility_preferences.text_to_speech ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {data?.accessibility_preferences.text_to_speech ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Reduced Visual Complexity:</span>
              <span
                className={`font-semibold ${
                  data?.accessibility_preferences.reduced_visual_complexity
                    ? 'text-indigo-700'
                    : 'text-slate-400'
                }`}
              >
                {data?.accessibility_preferences.reduced_visual_complexity ? 'Active' : 'Standard'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Keyboard Navigation:</span>
              <span
                className={`font-semibold ${
                  data?.accessibility_preferences.keyboard_navigation
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {data?.accessibility_preferences.keyboard_navigation ? 'Enhanced' : 'Standard'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 9. Assessment History Section */}
      {data?.assessment_history && data.assessment_history.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Diagnostic Assessment History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past assessment attempts and assigned baseline levels.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {data.assessment_history.length} Attempt(s)
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
                {data.assessment_history.map((att) => (
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
