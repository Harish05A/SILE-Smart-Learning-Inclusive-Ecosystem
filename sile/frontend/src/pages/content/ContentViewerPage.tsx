import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearningContentDetail } from '../../types/curriculum.types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  Eye,
} from 'lucide-react';


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
      <div className="max-w-4xl mx-auto space-y-6 py-6 animate-fadeIn">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="p-8 rounded-3xl bg-white border border-slate-200 space-y-6">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full rounded-md" count={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl max-w-2xl mx-auto my-8 space-y-4">
        <h2 className="text-lg font-bold">Error Loading Lesson</h2>
        <p className="text-sm text-rose-700">{error || 'Lesson module could not be found.'}</p>
        <Button variant="danger" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fadeIn">
      {/* Top Study Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-500 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="font-semibold text-slate-600 hover:text-brand-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded p-1"
            aria-label="Go back"
          >
            ← Back
          </button>
          <span>/</span>
          <Link to="/topics" className="hover:text-brand-600 transition-colors">
            Curriculum
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px]">
            {content.topic_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/ai-tutor?topic_id=${content.topic_id}&content_id=${content.id}`}
          >
            <Button variant="subtle" size="sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 mr-1" />
              <span>Adapt with AI Tutor</span>
            </Button>
          </Link>
          {pathId && (
            <Link to="/learning-path" className="font-semibold text-brand-600 hover:underline">
              Learning Path ➔
            </Link>
          )}
        </div>
      </div>

      {/* Main Study Mode Article */}
      <article className="bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden">
        {/* Lesson Header */}
        <header className="p-6 sm:p-8 bg-slate-900 text-white space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
              {content.subject_name || 'Mathematics'}
            </Badge>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
              {content.topic_name}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {content.difficulty_level}
            </span>
            <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{content.estimated_duration_minutes} mins</span>
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {content.title}
            </h1>
            {content.description && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                {content.description}
              </p>
            )}
          </div>
        </header>

        {/* Study Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Main Conceptual Text */}
          <div className="sile-prose space-y-4 whitespace-pre-line">
            {content.content_body}
          </div>

          {/* Visual Scaffold Payload Box (if present in curriculum module) */}
          {content.media_payload && (
            <section
              aria-labelledby="visual-scaffold-heading"
              className="p-5 bg-brand-50/50 border border-brand-200/80 rounded-2xl space-y-2.5"
            >
              <div className="flex items-center gap-2 text-brand-900 font-bold text-xs uppercase tracking-wider">
                <Eye className="w-4 h-4 text-brand-600" />
                <span id="visual-scaffold-heading">Visual Representation & Diagram</span>
              </div>
              <pre className="text-xs bg-slate-900 text-brand-200 p-4 rounded-xl overflow-x-auto font-mono">
                {JSON.stringify(content.media_payload, null, 2)}
              </pre>
            </section>
          )}

          {/* Bottom Action / Completion Bar */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {completed ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Module completed and logged to your progress!</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Ready to continue? Mark this module complete to update your learning path.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to={`/practice/${content.topic_id}`}>
                <Button variant="outline" size="md">
                  <Zap className="w-4 h-4 mr-1 text-amber-500" />
                  <span>Practice Questions</span>
                </Button>
              </Link>

              <Button
                variant="primary"
                size="md"
                onClick={handleMarkAsCompleted}
                disabled={completing || completed}
                className={completed ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {completing ? 'Updating...' : completed ? 'Completed ✓' : 'Mark as Completed ✓'}
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
