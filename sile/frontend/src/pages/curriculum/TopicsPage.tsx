import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import { adaptiveService } from '../../services/adaptive.service';
import { Topic, LearningContentSummary } from '../../types/curriculum.types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import {
  BookOpen,
  Zap,
  Sparkles,
  ArrowRight,
  Search,
  Layers,
} from 'lucide-react';

export const TopicsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subject_id') || undefined;


  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [contents, setContents] = useState<LearningContentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, [subjectId]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adaptiveService.getTopics(subjectId);
      setTopics(data);
      if (data.length > 0) {
        await selectTopic(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load topics:', err);
      setError(err.message || 'Failed to load curriculum topics.');
    } finally {
      setLoading(false);
    }
  };

  const selectTopic = async (topicId: string) => {
    try {
      setContentLoading(true);
      const [topicDetail, topicContents] = await Promise.all([
        adaptiveService.getTopicById(topicId),
        adaptiveService.getContent({ topic_id: topicId }),
      ]);
      setSelectedTopic(topicDetail);
      setContents(topicContents);
    } catch (err: any) {
      console.error('Failed to load topic details:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl max-w-2xl mx-auto my-8 space-y-4">
        <h2 className="text-lg font-bold">Error Loading Topics</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <Button variant="danger" size="sm" onClick={loadTopics}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60">
              Curriculum Map
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mathematics Topics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Structured prerequisite curriculum with granular skills and calibrated learning modules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/subjects">
            <Button variant="outline" size="sm">
              All Subjects
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main 2-Column Discovery Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Topic Sequence List */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              aria-label="Search curriculum topics"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shadow-xs"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1" role="tablist" aria-label="Topics list">
            {filteredTopics.map((topic, index) => {
              const isSelected = selectedTopic?.id === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(topic.id)}
                  role="tab"
                  aria-selected={isSelected}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white border-slate-200/90 text-slate-800 hover:border-brand-200 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          isSelected ? 'text-brand-100' : 'text-slate-400'
                        }`}
                      >
                        {topic.code}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm truncate">{topic.name}</h3>
                    <p
                      className={`text-[11px] truncate ${
                        isSelected ? 'text-brand-100' : 'text-slate-500'
                      }`}
                    >
                      {topic.skills_count || 0} skills • {topic.contents_count || 0} modules
                    </p>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isSelected ? 'text-white translate-x-0.5' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Topic Detail & Modules */}
        <div className="lg:col-span-2 space-y-6">
          {contentLoading ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3 animate-pulse">
              <Skeleton className="h-6 w-1/2 mx-auto rounded-lg" />
              <Skeleton className="h-4 w-3/4 mx-auto rounded-md" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : selectedTopic ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Topic Hero Card */}
              <Card variant="elevated" padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{selectedTopic.code}</Badge>
                    <span className="text-xs text-slate-500 font-medium">
                      Sequence #{selectedTopic.order_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/practice/${selectedTopic.id}`}>
                      <Button variant="outline" size="sm">
                        <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        <span>Practice Topic</span>
                      </Button>
                    </Link>
                    <Link to={`/ai-tutor?topic_id=${selectedTopic.id}`}>
                      <Button variant="subtle" size="sm">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-600" />
                        <span>AI Tutor</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {selectedTopic.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedTopic.description ||
                      'Master foundational mathematical concepts and build confidence through progressive steps.'}
                  </p>
                </div>
              </Card>

              {/* Granular Skills Breakdown */}
              {selectedTopic.skills && selectedTopic.skills.length > 0 && (
                <section aria-labelledby="skills-breakdown-heading" className="space-y-3">
                  <h3 id="skills-breakdown-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-600" />
                    <span>Granular Skills & Competencies</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedTopic.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/90 text-xs flex items-center justify-between shadow-xs"
                      >
                        <span className="font-semibold text-slate-800">{skill.name}</span>
                        <Badge variant="default" size="sm">
                          {skill.difficulty_level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Calibrated Content Modules */}
              <section aria-labelledby="modules-heading" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 id="modules-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                    <span>Learning Content Modules ({contents.length})</span>
                  </h3>
                </div>

                {contents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {contents.map((content) => (
                      <Card
                        key={content.id}
                        variant="default"
                        padding="md"
                        className="hover:border-brand-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="brand" size="sm">
                              {content.content_type}
                            </Badge>
                            <Badge variant="default" size="sm">
                              {content.difficulty_level}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              ⏱️ ~{content.estimated_duration_minutes}m
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {content.title}
                          </h4>
                          {content.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {content.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link to={`/content/${content.id}`}>
                            <Button variant="primary" size="sm">
                              <span>Read Lesson</span>
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                          <Link
                            to={`/ai-tutor?topic_id=${selectedTopic.id}&content_id=${content.id}`}
                            title="Adapt this lesson with AI Tutor"
                          >
                            <Button variant="subtle" size="sm">
                              <Sparkles className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card variant="subtle" padding="lg" className="text-center py-8">
                    <p className="text-xs text-slate-500">
                      No calibrated modules currently uploaded for this topic. Use the AI Tutor to generate adaptive explanations.
                    </p>
                  </Card>
                )}
              </section>
            </div>
          ) : (
            <Card variant="subtle" padding="lg" className="text-center py-12">
              <p className="text-sm text-slate-500">Select a topic from the left list to view curriculum breakdown.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
