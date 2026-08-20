import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearningPath } from '../../types/adaptive.types';

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
      setError(err.message || 'Failed to generate new learning path.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              My Personalized Learning Path
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Topologically sequenced milestones dynamically generated from your diagnostic gaps.
            </p>
          </div>
          <button
            onClick={handleGenerateNewPath}
            disabled={generating}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
          >
            {generating ? 'Generating Path...' : '+ Generate New Adaptive Path'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {activePath ? (
        <div className="space-y-6">
          {/* Path Header & Progress Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 text-indigo-700">
                  {activePath.subject_name || 'Mathematics'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {activePath.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">{activePath.description}</p>
              </div>

              <div className="text-right self-start sm:self-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  activePath.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  activePath.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {activePath.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Progress Bar & Stats */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Progress: {activePath.completed_items} of {activePath.total_items} items completed</span>
                <span>{activePath.progress_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${activePath.progress_percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-400 text-right">
                Total Estimated Duration: ~{activePath.total_estimated_duration_minutes} minutes
              </div>
            </div>
          </div>

          {/* Ordered Learning Items Timeline */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 px-1">
              Step-by-Step Curriculum Progression ({activePath.items.length} Modules)
            </h3>

            <div className="space-y-3">
              {activePath.items.map((item) => {
                const isCompleted = item.status === 'completed';
                const isInProgress = item.status === 'in_progress';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
                      isInProgress
                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number Bubble */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isInProgress
                            ? 'bg-indigo-600 text-white shadow-md animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted ? '✓' : item.sequence_number}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase">
                            {item.topic_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700' :
                            item.difficulty === 'developing' ? 'bg-amber-100 text-amber-700' :
                            item.difficulty === 'proficient' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {item.difficulty}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ⏱️ ~{item.estimated_duration_minutes} mins
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900">
                          {item.content_title}
                        </h4>

                        {isCompleted && item.completed_at && (
                          <div className="text-xs text-emerald-700">
                            Completed on {new Date(item.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() =>
                          navigate(
                            `/content/${item.content_id}?path_id=${activePath.id}&item_id=${item.id}`
                          )
                        }
                        className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                          isInProgress
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                            : isCompleted
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCompleted ? 'Review Lesson' : isInProgress ? 'Continue Lesson →' : 'Start Step'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="text-4xl">🗺️</div>
          <h2 className="text-xl font-bold text-slate-900">No Learning Path Generated Yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click below to generate a tailored 5-10 step learning path matching your diagnostic results.
          </p>
          <button
            onClick={handleGenerateNewPath}
            disabled={generating}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md"
          >
            {generating ? 'Generating Path...' : 'Generate My Adaptive Path'}
          </button>
        </div>
      )}
    </div>
  );
};
