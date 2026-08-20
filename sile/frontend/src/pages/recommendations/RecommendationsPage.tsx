import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { RecommendationItem } from '../../types/adaptive.types';

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
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-2xl mx-auto my-8">
        <h2 className="text-lg font-semibold mb-2">Error Loading Recommendations</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={loadRecommendations}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Personalized Recommendations
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Deterministic, rule-based lessons prioritized to reinforce gaps and accelerate concept mastery.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 self-start sm:self-auto"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div
              key={rec.id || idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col md:flex-row justify-between md:items-center gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                    {rec.topic_name}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    rec.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                    rec.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {rec.priority} Priority
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    rec.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-700' :
                    rec.difficulty === 'developing' ? 'bg-amber-50 text-amber-700' :
                    rec.difficulty === 'proficient' ? 'bg-blue-50 text-blue-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {rec.difficulty}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto md:ml-0">
                    ⏱️ ~{rec.estimated_duration_minutes} mins
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {rec.content_title || 'Targeted Concept Mastery Module'}
                </h2>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Why this was recommended: </span>
                  <span className="italic">{rec.reason}</span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {rec.content_id ? (
                  <button
                    onClick={() => navigate(`/content/${rec.content_id}`)}
                    className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                  >
                    Start Lesson →
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/topics')}
                    className="w-full md:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl"
                  >
                    View Topic Skills
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="text-3xl">🎉</div>
          <h2 className="text-lg font-bold text-slate-900">No Pending Recommendations</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Take a baseline assessment or practice diagnostic to generate new recommendations.
          </p>
          <Link
            to="/assessments"
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-sm"
          >
            Go to Assessments
          </Link>
        </div>
      )}
    </div>
  );
};
