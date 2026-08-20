import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { LearnerPerformanceOverview, TopicPerformanceMetric } from '../../types/adaptive.types';

export const TopicPerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<LearnerPerformanceOverview | null>(null);
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
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-2xl mx-auto my-8">
        <h2 className="text-lg font-semibold mb-2">Error Loading Analytics</h2>
        <p className="mb-4">{error || 'Data unavailable.'}</p>
        <button
          onClick={loadPerformance}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const renderTopicCard = (topic: TopicPerformanceMetric) => {
    const isLow = topic.mastery_status === 'low';
    const isDeveloping = topic.mastery_status === 'developing';
    const isGood = topic.mastery_status === 'good';

    return (
      <div
        key={topic.topic_id}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between"
      >
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold font-mono">
              {topic.topic_code}
            </span>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase ${
                isLow ? 'bg-red-100 text-red-700' :
                isDeveloping ? 'bg-amber-100 text-amber-700' :
                isGood ? 'bg-blue-100 text-blue-700' :
                'bg-emerald-100 text-emerald-700'
              }`}
            >
              {topic.mastery_status} Mastery
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">{topic.topic_name}</h3>
            <p className="text-xs text-slate-500">{topic.subject_name}</p>
          </div>

          {/* Mastery & Accuracy Stats */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Mastery Index:</span>
              <span className="text-slate-900 font-bold">{topic.mastery_percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  isLow ? 'bg-red-500' :
                  isDeveloping ? 'bg-amber-500' :
                  isGood ? 'bg-blue-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${topic.mastery_percentage}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">LIFETIME ACCURACY</span>
                <span className="font-bold text-slate-800">{topic.accuracy}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RECENT ACCURACY</span>
                <span className="font-bold text-slate-800">{topic.recent_accuracy}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">QUESTIONS ATTEMPTED</span>
                <span className="font-bold text-slate-800">
                  {topic.correct_answers} / {topic.total_attempts} correct
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CALIBRATED LEVEL</span>
                <span className="font-bold text-slate-800 capitalize">{topic.current_difficulty}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Link
            to={`/topics`}
            className="w-full inline-block text-center py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Explore Lessons in Topic →
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Curriculum Mastery & Performance
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Transparent, explainable topic-by-topic mastery tracking calculated from baseline and practice results.
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

      {/* Global Summary Metric Cards */}
      <section aria-label="Performance Metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Overall Accuracy
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 mt-2">
            {performance.overall_accuracy}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Across {performance.total_questions_attempted} diagnostic questions
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Average Mastery Index
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            {performance.overall_mastery}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Weighted recency-adjusted index
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Concept Health
          </div>
          <div className="text-sm font-bold text-slate-800 mt-2 flex justify-center gap-3">
            <span className="text-red-600">{performance.weak_topics.length} Weak</span>
            <span className="text-amber-600">{performance.developing_topics.length} Dev</span>
            <span className="text-emerald-600">{performance.strong_topics.length} Strong</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {performance.all_topics.length} Curriculum Topics Evaluated
          </p>
        </div>
      </section>

      {/* Mastery Thresholds Explanation */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex flex-wrap justify-between items-center gap-2">
        <span className="font-bold">Transparent Rule-Based Mastery Thresholds:</span>
        <span className="text-red-700 font-semibold">&lt; 40%: Low Mastery (Needs Reinforcement)</span>
        <span className="text-amber-700 font-semibold">40%–69%: Developing</span>
        <span className="text-blue-700 font-semibold">70%–84%: Good</span>
        <span className="text-emerald-700 font-semibold">85%+: High Mastery</span>
      </div>

      {/* Weak Topics Section */}
      {performance.weak_topics.length > 0 && (
        <section aria-labelledby="weak-topics-title" className="space-y-4">
          <h2 id="weak-topics-title" className="text-lg font-bold text-red-700 flex items-center gap-2">
            <span>⚠️</span> Focus Topics Needing Reinforcement ({performance.weak_topics.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performance.weak_topics.map(renderTopicCard)}
          </div>
        </section>
      )}

      {/* Developing Topics Section */}
      {performance.developing_topics.length > 0 && (
        <section aria-labelledby="dev-topics-title" className="space-y-4">
          <h2 id="dev-topics-title" className="text-lg font-bold text-amber-700 flex items-center gap-2">
            <span>📈</span> Developing Topics in Progress ({performance.developing_topics.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performance.developing_topics.map(renderTopicCard)}
          </div>
        </section>
      )}

      {/* Strong Topics Section */}
      {performance.strong_topics.length > 0 && (
        <section aria-labelledby="strong-topics-title" className="space-y-4">
          <h2 id="strong-topics-title" className="text-lg font-bold text-emerald-700 flex items-center gap-2">
            <span>🏆</span> Mastered Topics ({performance.strong_topics.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performance.strong_topics.map(renderTopicCard)}
          </div>
        </section>
      )}
    </div>
  );
};
