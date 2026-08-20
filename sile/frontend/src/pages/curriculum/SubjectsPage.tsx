import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { Subject } from '../../types/curriculum.types';

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      console.error('Failed to load subjects:', err);
      setError(err.message || 'Failed to load subjects. Please try again.');
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
        <h2 className="text-lg font-semibold mb-2">Error Loading Subjects</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={loadSubjects}
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
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Curriculum Subjects</h1>
            <p className="text-slate-600 text-sm mt-1">
              Select a subject to explore topics, skills, and adaptive learning content.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((subj) => (
          <div
            key={subj.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {subj.code}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {subj.topics_count} Topics
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{subj.name}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {subj.description || 'Comprehensive foundational curriculum tailored to learner pace.'}
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Curriculum sequence #{subj.order_number}</span>
              <Link
                to={`/topics?subject_id=${subj.id}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Explore Topics →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
