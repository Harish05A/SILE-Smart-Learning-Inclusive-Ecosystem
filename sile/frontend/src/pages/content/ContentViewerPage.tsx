import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearningContentDetail } from '../../types/curriculum.types';

export const ContentViewerPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pathId = searchParams.get('path_id');
  const itemId = searchParams.get('item_id');

  const [content, setContent] = useState<LearningContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contentId) {
      loadContent(contentId);
    }
  }, [contentId]);

  const loadContent = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getContentById(id);
      setContent(data);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err.message || 'Unable to load learning content.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    try {
      setCompleting(true);
      if (pathId && itemId) {
        await adaptiveService.updatePathItemStatus(pathId, itemId, 'completed');
      }
      setCompleted(true);
    } catch (err: any) {
      console.error('Failed to update progress status:', err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-2xl mx-auto my-8">
        <h2 className="text-lg font-semibold mb-2">Error Loading Lesson</h2>
        <p className="mb-4">{error || 'Lesson not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb / Back Link */}
      <div className="flex justify-between items-center text-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1"
        >
          ← Back
        </button>
        {pathId && (
          <Link
            to="/learning-path"
            className="text-indigo-600 font-semibold hover:underline"
          >
            My Learning Path ➔
          </Link>
        )}
      </div>

      {/* Main Content Article */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Lesson Header */}
        <header className="p-6 sm:p-8 bg-slate-900 text-white space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-500 text-white">
              {content.subject_name || 'Mathematics'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
              {content.topic_name}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              content.difficulty_level === 'beginner' ? 'bg-emerald-500 text-white' :
              content.difficulty_level === 'developing' ? 'bg-amber-500 text-white' :
              content.difficulty_level === 'proficient' ? 'bg-blue-500 text-white' :
              'bg-purple-500 text-white'
            }`}>
              {content.difficulty_level}
            </span>
            <span className="ml-auto text-xs text-slate-400">
              ⏱️ ~{content.estimated_duration_minutes} mins duration
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {content.title}
          </h1>
          {content.description && (
            <p className="text-slate-300 text-sm">{content.description}</p>
          )}
        </header>

        {/* Lesson Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-4 whitespace-pre-line text-base font-normal">
            {content.content_body}
          </div>

          {/* Interactive/Visual Scaffold Payload Box (if present) */}
          {content.media_payload && (
            <div className="mt-8 p-5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <span>🔍</span>
                <span>Visual Representation & Step Payload</span>
              </div>
              <pre className="text-xs bg-white p-3 rounded-lg border border-indigo-100 overflow-x-auto text-slate-700 font-mono">
                {JSON.stringify(content.media_payload, null, 2)}
              </pre>
            </div>
          )}

          {/* Completion Action Bar */}
          <div className="pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {completed ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <span>✅</span>
                  <span>Lesson marked as completed!</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Ready to continue? Mark this module completed to update your learning path.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAsCompleted}
                disabled={completing || completed}
                className={`px-6 py-3 font-semibold rounded-xl text-sm transition-all shadow-md ${
                  completed
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {completing ? 'Updating...' : completed ? 'Completed ✓' : 'Mark as Completed ✓'}
              </button>

              {pathId && completed && (
                <button
                  onClick={() => navigate('/learning-path')}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Next Step in Path →
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
