import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { Topic, LearningContentSummary } from '../../types/curriculum.types';

export const TopicsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subjectId = searchParams.get('subject_id') || undefined;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [contents, setContents] = useState<LearningContentSummary[]>([]);
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
        <h2 className="text-lg font-semibold mb-2">Error Loading Topics</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={loadTopics}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mathematics Curriculum Topics</h1>
            <p className="text-slate-600 text-sm mt-1">
              Prerequisite-ordered topics with granular skills and calibrated lessons.
            </p>
          </div>
          <Link
            to="/subjects"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            ← All Subjects
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Topic List (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Curriculum Sequence
          </h2>
          {topics.map((t, idx) => {
            const isSelected = selectedTopic?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTopic(t.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className={isSelected ? 'text-indigo-200' : 'text-slate-400 font-mono font-medium'}>
                    Step {idx + 1} • {t.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.contents_count} Lessons
                  </span>
                </div>
                <div className="font-bold text-base">{t.name}</div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Selected Topic Detail, Skills, & Content (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTopic ? (
            <>
              {/* Topic Header Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                    {selectedTopic.code}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedTopic.prerequisite_topic_id && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium border border-amber-100">
                        Has Prerequisites
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/practice?topic_id=${selectedTopic.id}`)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Start Adaptive Practice</span>
                    </button>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedTopic.name}</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {selectedTopic.description}
                </p>

                {/* Sub-Skills Breakdown */}
                {selectedTopic.skills && selectedTopic.skills.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Mastery Skills Covered ({selectedTopic.skills.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTopic.skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs"
                        >
                          <div className="font-semibold text-slate-800">{skill.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                            <span>Level: {skill.difficulty_level}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Modules in this Topic */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Available Learning Content ({contents.length})
                </h3>

                {contentLoading ? (
                  <div className="p-8 text-center text-slate-500">Loading lessons...</div>
                ) : contents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {contents.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                              {item.content_type}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              item.difficulty_level === 'beginner' ? 'bg-emerald-100 text-emerald-700' :
                              item.difficulty_level === 'developing' ? 'bg-amber-100 text-amber-700' :
                              item.difficulty_level === 'proficient' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {item.difficulty_level}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">⏱️ {item.estimated_duration_minutes} mins</span>
                          <button
                            onClick={() => navigate(`/content/${item.id}`)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                          >
                            Open Lesson →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    No content items created for this topic yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              Select a topic from the left to view skills and lessons.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
