import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearnerPerformanceOverview, TopicPerformanceMetric } from '../../types/adaptive.types';
import { Card } from '../../components/ui/Card';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import {
  BarChart2,
  CheckCircle2,
  TrendingUp,
  Zap,
  Sparkles,
  ArrowRight,
  Target,
} from 'lucide-react';


export const TopicPerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<LearnerPerformanceOverview | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'strong' | 'developing' | 'weak'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getPerformance();
      setPerformance(data);
    } catch (err: any) {
      console.error('Failed to load topic performance:', err);
      setError(err.message || 'Unable to load performance analytics.');
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl max-w-2xl mx-auto my-8 space-y-4">
        <h2 className="text-lg font-bold">Error Loading Analytics</h2>
        <p className="text-sm text-rose-700">{error || 'Data unavailable.'}</p>
        <Button variant="danger" size="sm" onClick={loadPerformance}>
          Try Again
        </Button>
      </div>
    );
  }

  const allTopics = performance.all_topics || [];
  const strongTopics = performance.strong_topics || [];
  const developingTopics = performance.developing_topics || [];
  const weakTopics = performance.weak_topics || [];

  const getFilteredTopics = (): TopicPerformanceMetric[] => {
    switch (activeFilter) {
      case 'strong':
        return strongTopics;
      case 'developing':
        return developingTopics;
      case 'weak':
        return weakTopics;
      default:
        return allTopics;
    }
  };

  const filteredTopics = getFilteredTopics();


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'high':
      case 'good':
        return <Badge variant="success">Mastered ({status})</Badge>;
      case 'developing':
        return <Badge variant="warning">Developing</Badge>;
      default:
        return <Badge variant="danger">Needs Focus</Badge>;
    }
  };

  const getStatusProgressColor = (status: string) => {
    switch (status) {
      case 'high':
      case 'good':
        return 'bg-emerald-500';
      case 'developing':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60">
              Mastery & Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Progress & Understanding
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Authoritative mastery metrics computed from diagnostic baseline and adaptive practice attempts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/recommendations">
            <Button variant="primary" size="sm">
              <span>View Recommendations</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Concept Health Overview Cards */}
      <section aria-labelledby="concept-health-heading" className="space-y-3">
        <h2 id="concept-health-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <span>Concept Health Summary</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            variant="default"
            padding="md"
            className="cursor-pointer hover:border-emerald-300 transition-all"
            onClick={() => setActiveFilter('strong')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Strong & Mastered
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{strongTopics.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Concepts with ≥70% mastery. Solid foundational grasp.
            </p>
          </Card>

          <Card
            variant="default"
            padding="md"
            className="cursor-pointer hover:border-amber-300 transition-all"
            onClick={() => setActiveFilter('developing')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Developing
              </span>
              <BarChart2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{developingTopics.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Concepts between 40%–69%. Good candidate for practice.
            </p>
          </Card>

          <Card
            variant="default"
            padding="md"
            className="cursor-pointer hover:border-rose-300 transition-all"
            onClick={() => setActiveFilter('weak')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Needs Attention
              </span>
              <Target className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{weakTopics.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Concepts &lt;40% mastery. Recommended for AI Tutor breakdown.
            </p>
          </Card>
        </div>
      </section>

      {/* Filter Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All Concepts', badge: allTopics.length },
          { id: 'strong', label: 'Strong', badge: strongTopics.length },
          { id: 'developing', label: 'Developing', badge: developingTopics.length },
          { id: 'weak', label: 'Needs Focus', badge: weakTopics.length },
        ]}
        activeTab={activeFilter}
        onChange={(id) => setActiveFilter(id as any)}
      />

      {/* Topic Mastery Progression Cards Grid */}
      <section aria-labelledby="topic-cards-heading" className="space-y-4">
        <h2 id="topic-cards-heading" className="sr-only">
          Topic Mastery Progression
        </h2>

        {filteredTopics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTopics.map((topic) => (
              <Card
                key={topic.topic_id}
                variant="default"
                padding="md"
                className="space-y-4 flex flex-col justify-between hover:border-brand-300 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {topic.topic_code}
                    </span>
                    {getStatusBadge(topic.mastery_status)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{topic.topic_name}</h3>
                    <p className="text-xs text-slate-500">{topic.subject_name}</p>
                  </div>

                  {/* Progress Bar & Mastery Score */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Mastery Score</span>
                      <span className="font-extrabold text-slate-900">{topic.mastery_percentage}%</span>
                    </div>
                    <div
                      className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80"
                      role="progressbar"
                      aria-valuenow={topic.mastery_percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${topic.topic_name} mastery`}
                    >
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusProgressColor(
                          topic.mastery_status
                        )}`}
                        style={{ width: `${topic.mastery_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Accuracy & Attempts Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Attempts:</span>
                      <span className="font-bold text-slate-800">{topic.total_attempts} questions</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Lifetime Accuracy:</span>
                      <span className="font-bold text-slate-800">{Math.round(topic.accuracy)}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link to={`/practice/${topic.topic_id}`}>
                    <Button variant="outline" size="sm">
                      <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      <span>Practice</span>
                    </Button>
                  </Link>

                  <Link to={`/ai-tutor?topic_id=${topic.topic_id}`}>
                    <Button variant="subtle" size="sm">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-600" />
                      <span>AI Adapt</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="subtle" padding="lg" className="text-center py-10">
            <p className="text-xs text-slate-500">No concepts found under the &quot;{activeFilter}&quot; category.</p>
          </Card>
        )}
      </section>
    </div>
  );
};
