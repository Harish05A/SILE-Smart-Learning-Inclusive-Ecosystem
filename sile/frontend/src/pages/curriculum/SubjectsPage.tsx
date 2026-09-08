import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { Subject } from '../../types/curriculum.types';
import { Card, CardTitle, CardDescription, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ArrowRight } from 'lucide-react';


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
      setError(err.message || 'Failed to load curriculum subjects.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl max-w-2xl mx-auto my-8 space-y-4">
        <h2 className="text-lg font-bold">Error Loading Subjects</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <Button variant="danger" size="sm" onClick={loadSubjects}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60">
              Curriculum Discovery
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Curriculum Subjects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select a subject to explore prerequisite-ordered topics, granular skills, and calibrated learning modules.
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            ← Dashboard
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((subj) => (
          <Card
            key={subj.id}
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="brand" size="sm">
                  {subj.code}
                </Badge>
                <span className="text-xs text-slate-400 font-medium">
                  {subj.topics_count} Topics
                </span>
              </div>

              <CardTitle className="text-xl">{subj.name}</CardTitle>
              <CardDescription className="text-sm">
                {subj.description ||
                  'Comprehensive foundational curriculum calibrated to your individual learning trajectory.'}
              </CardDescription>
            </div>

            <CardFooter className="pt-4 mt-6">
              <span className="text-xs text-slate-400 font-medium">
                Sequence #{subj.order_number}
              </span>
              <Link to={`/topics?subject_id=${subj.id}`}>
                <Button variant="primary" size="sm">
                  <span>Explore Topics</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
