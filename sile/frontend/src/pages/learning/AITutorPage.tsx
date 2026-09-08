import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adaptiveService } from '../../services/adaptive.service';
import { agentService } from '../../services/agent.service';
import { Topic, LearningContentSummary } from '../../types/curriculum.types';
import {
  AgentSessionType,
  MultiAgentResponse,
  AssessmentQuestionResult,
  WorkedExample,
} from '../../types/agent.types';
import { formatApiErrorMessage } from '../../services/api.client';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

import {
  Sparkles,
  BookOpen,
  Brain,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Check,
  X,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  Scale,
  RefreshCw,
} from 'lucide-react';

export const AITutorPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const preselectedTopicId = searchParams.get('topic_id') || '';
  const preselectedContentId = searchParams.get('content_id') || '';
  const initialMode = (searchParams.get('mode') as AgentSessionType) || 'lesson_adaptation';

  // Form State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contents, setContents] = useState<LearningContentSummary[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(preselectedTopicId);
  const [selectedContentId, setSelectedContentId] = useState<string>(preselectedContentId);
  const [sessionType, setSessionType] = useState<AgentSessionType>(initialMode);
  const [userInquiry, setUserInquiry] = useState<string>('');

  // Execution & UI State
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);
  const [isCoordinating, setIsCoordinating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MultiAgentResponse | null>(null);
  const [showResearchTrace, setShowResearchTrace] = useState<boolean>(false);

  // Formative Assessment State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);

  // Load Topics on mount
  useEffect(() => {
    loadTopics();
  }, []);

  // When selected topic changes, load its content items
  useEffect(() => {
    if (selectedTopicId) {
      loadContents(selectedTopicId);
    } else {
      setContents([]);
      setSelectedContentId('');
    }
  }, [selectedTopicId]);

  // If initial URL parameters are present, trigger auto-coordination
  useEffect(() => {
    if (preselectedTopicId && !result && !isCoordinating) {
      handleCoordinate(preselectedTopicId, preselectedContentId, initialMode);
    }
  }, [preselectedTopicId]);

  const loadTopics = async () => {
    try {
      setLoadingMetadata(true);
      const data = await adaptiveService.getTopics();
      setTopics(data || []);
      if (!selectedTopicId && data && data.length > 0 && !preselectedTopicId) {
        setSelectedTopicId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load curriculum topics:', err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const loadContents = async (topicId: string) => {
    try {
      const data = await adaptiveService.getContent({ topic_id: topicId });
      setContents(data || []);
      if (preselectedContentId && data && data.some((c) => c.id === preselectedContentId)) {
        setSelectedContentId(preselectedContentId);
      } else if (data && data.length > 0 && !selectedContentId) {
        setSelectedContentId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load topic contents:', err);
    }
  };

  const handleCoordinate = async (
    tId: string = selectedTopicId,
    cId: string = selectedContentId,
    sType: AgentSessionType = sessionType,
    inquiry: string = userInquiry
  ) => {
    if (!tId && !cId && !inquiry.trim()) {
      setError('Please select a topic or enter a question to start your AI learning session.');
      return;
    }

    try {
      setIsCoordinating(true);
      setError(null);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);

      const response = await agentService.coordinate({
        session_type: sType,
        topic_id: tId || undefined,
        content_id: cId || undefined,
        user_inquiry: inquiry.trim() || undefined,
      });

      setResult(response);
    } catch (err: any) {
      console.error('Agent coordination error:', err);
      setError(formatApiErrorMessage(err));
    } finally {
      setIsCoordinating(false);
    }
  };

  const handleAssessmentSubmit = () => {
    if (!selectedAnswer) return;
    setAnswerSubmitted(true);
  };

  const getTopicName = (id?: string) => {
    if (!id) return '';
    const topic = topics.find((t) => t.id === id);
    return topic ? topic.name : '';
  };

  // Safe normalized assessment question
  const currentAssessmentQuestion = useMemo<AssessmentQuestionResult | null>(() => {
    if (!result?.assessment) return null;
    if (Array.isArray(result.assessment)) {
      return result.assessment.length > 0 ? result.assessment[0] : null;
    }
    return result.assessment;
  }, [result?.assessment]);

  // Safe normalized accessibility object
  const accessibilityData = useMemo(() => {
    return result?.accessibility_adaptation || result?.accessibility || null;
  }, [result?.accessibility_adaptation, result?.accessibility]);

  // Safe normalized agent logs list
  const agentLogs = useMemo(() => {
    return result?.agent_results || result?.execution_trace || [];
  }, [result?.agent_results, result?.execution_trace]);

  // Normalized helper to render worked example steps safely
  const renderWorkedExampleSteps = (example: WorkedExample) => {
    if (example.solution_steps && Array.isArray(example.solution_steps)) {
      return example.solution_steps.map((stepText, idx) => (
        <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
            {idx + 1}
          </span>
          <div className="space-y-1 flex-1">
            <p className="text-slate-800">{stepText}</p>
          </div>
        </div>
      ));
    }

    if (example.steps && Array.isArray(example.steps)) {
      return example.steps.map((st, idx) => {
        const stepNum = typeof st === 'object' && st.step_number ? st.step_number : idx + 1;
        const explanation = typeof st === 'object' ? st.explanation : String(st);
        const mathCode = typeof st === 'object' ? st.math_or_code : undefined;

        return (
          <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
              {stepNum}
            </span>
            <div className="space-y-1 flex-1">
              <p className="text-slate-800">{explanation}</p>
              {mathCode && (
                <pre className="text-xs bg-slate-900 text-emerald-300 p-2.5 rounded-xl font-mono overflow-x-auto">
                  {mathCode}
                </pre>
              )}
            </div>
          </div>
        );
      });
    }

    if (example.explanation) {
      return (
        <div className="text-xs sm:text-sm text-slate-800 p-3 bg-slate-50 rounded-xl">
          {example.explanation}
        </div>
      );
    }

    return null;
  };

  const adaptedTitle =
    result?.adapted_content?.adapted_title ||
    result?.adapted_content?.title ||
    'Personalized Adaptive Lesson';

  const adaptedExplanation =
    result?.adapted_content?.conceptual_explanation ||
    result?.adapted_content?.adapted_explanation ||
    '';

  const scaffoldingNotes =
    result?.adapted_content?.scaffolding_steps ||
    result?.adapted_content?.scaffolding_notes ||
    [];

  const difficultyRating =
    result?.adapted_content?.complexity_level ||
    result?.adapted_content?.difficulty_rating ||
    'Adaptive';

  const targetTopicId =
    result?.learner_context?.target_topic_id ||
    selectedTopicId ||
    '';

  const masteryScoreVal =
    result?.learner_context?.mastery_score ??
    result?.learner_context?.overall_mastery ??
    0.85;

  const detectedMasteryLevel =
    result?.learner_context?.detected_mastery_level ||
    result?.learner_context?.learner_level ||
    'Intermediate';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fadeIn">
      {/* 1. Header & Navigation Breadcrumbs */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              <span>Pedagogical Learning Companion</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            AI Adaptive Learning Partner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            SILE analyzes your mastery profile, synthesizes step-by-step scaffolded explanations, and constructs targeted checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/evaluation">
            <Button variant="outline" size="sm">
              <Scale className="w-3.5 h-3.5 text-slate-600 mr-1" />
              <span>Evaluation</span>
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Focused Session Configuration Card */}
      <section
        aria-labelledby="tutor-config-heading"
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 id="tutor-config-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Session Configuration</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Step 1 of 4 • Target Setup</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Topic Selector */}
          <div>
            <label htmlFor="topic-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Curriculum Topic
            </label>
            <select
              id="topic-select"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={loadingMetadata || isCoordinating}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium"
            >
              <option value="">-- Select a Topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Content Item */}
          <div>
            <label htmlFor="content-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Base Lesson / Content (Optional)
            </label>
            <select
              id="content-select"
              value={selectedContentId}
              onChange={(e) => setSelectedContentId(e.target.value)}
              disabled={loadingMetadata || contents.length === 0 || isCoordinating}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium disabled:opacity-50"
            >
              <option value="">-- Complete Topic Context --</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Pedagogical Goal
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'lesson_adaptation' as AgentSessionType,
                title: 'Adaptive Lesson',
                desc: 'Tailored explanation based on your mastery',
              },
              {
                id: 'interactive_tutoring' as AgentSessionType,
                title: 'Interactive Tutoring',
                desc: 'Deep explanation + formative check',
              },
              {
                id: 'formative_assessment' as AgentSessionType,
                title: 'Diagnostic Checkpoint',
                desc: 'Check understanding with instant feedback',
              },
            ].map((m) => {
              const active = sessionType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSessionType(m.id)}
                  disabled={isCoordinating}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    active
                      ? 'border-brand-600 bg-brand-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between">
                    <span>{m.title}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Inquiry */}
        <div>
          <label htmlFor="user-inquiry" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Ask a Specific Question (Optional)
          </label>
          <div className="relative">
            <input
              id="user-inquiry"
              type="text"
              placeholder="e.g. Can you explain this with a real-world example or simplify the steps?"
              value={userInquiry}
              onChange={(e) => setUserInquiry(e.target.value)}
              disabled={isCoordinating}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCoordinate();
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-12 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
            <Sparkles className="w-4 h-4 text-brand-500 absolute right-4 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleCoordinate()}
            disabled={isCoordinating || (!selectedTopicId && !selectedContentId && !userInquiry.trim())}
            className="w-full sm:w-auto shadow-button"
          >
            {isCoordinating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span>Orchestrating Agents...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span>Adapt for Me</span>
              </>
            )}
          </Button>
        </div>
      </section>

      {/* 3. Error Feedback */}
      {error && (
        <div
          role="alert"
          className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 flex items-start gap-3 shadow-xs animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-900">Adaptation Request Failed</h3>
            <p className="text-xs sm:text-sm text-rose-700">{error}</p>
            <button
              onClick={() => handleCoordinate()}
              className="mt-2 text-xs font-bold text-rose-900 underline hover:no-underline"
            >
              Try Again ➔
            </button>
          </div>
        </div>
      )}

      {/* 4. Progressive Loading Feedback */}
      {isCoordinating && (
        <div
          aria-live="polite"
          className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-card text-center space-y-6 animate-pulse"
        >
          <div className="inline-flex p-4 bg-brand-50 rounded-2xl text-brand-600 shadow-subtle">
            <Brain className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">Personalizing Your Learning Experience</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Evaluating your baseline profile, structuring progressive explanations, and verifying accessible formatting via live AI agents.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 text-xs text-brand-700 font-semibold">
              1. Learner Profile
            </div>
            <div className="p-3 bg-brand-50/70 rounded-xl border border-brand-200/70 text-xs text-brand-700 font-medium">
              2. Content Breakdown
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
              3. Checkpoint Test
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
              4. Accessibility Pass
            </div>
          </div>
        </div>
      )}

      {/* 5. Coordinated Multi-Agent Learning Output */}
      {result && !isCoordinating && (
        <main className="space-y-8 animate-fadeIn" aria-label="Adapted Lesson Content">
          {/* Learning Flow Tracker */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-around gap-2 text-xs font-semibold">
            <span className="text-brand-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Understand</span>
            </span>
            <span className="text-slate-300">➔</span>
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">2</span>
              <span>Worked Examples</span>
            </span>
            <span className="text-slate-300">➔</span>
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">3</span>
              <span>Check Understanding</span>
            </span>
            <span className="text-slate-300">➔</span>
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">4</span>
              <span>Reflect</span>
            </span>
          </div>

          {/* Adapted Lesson Article */}
          {result.adapted_content && (
            <article className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden space-y-6">
              {/* Header */}
              <div className="p-6 sm:p-8 bg-slate-900 text-white space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                    {getTopicName(targetTopicId) || 'Curriculum Lesson'}
                  </Badge>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {difficultyRating}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Personalized Adaptation ✓
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {adaptedTitle}
                </h2>

                {/* Target Learning Objective */}
                {result.adapted_content.learning_objective && (
                  <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-300 space-y-1">
                    <span className="font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                      <BookOpen className="w-3.5 h-3.5" />
                      Target Learning Objective
                    </span>
                    <p className="font-medium text-slate-100">{result.adapted_content.learning_objective}</p>
                  </div>
                )}

                {/* Key Concepts */}
                {result.adapted_content.key_concepts && result.adapted_content.key_concepts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {result.adapted_content.key_concepts.map((kc, kIdx) => (
                      <span
                        key={kIdx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-brand-200 border border-slate-700"
                      >
                        • {kc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lesson Body */}
              <div className="p-6 sm:p-8 space-y-8">
                {/* 1. UNDERSTAND: Conceptual Breakdown */}
                {adaptedExplanation && (
                  <section aria-labelledby="concept-explanation-heading" className="space-y-3">
                    <h3 id="concept-explanation-heading" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-brand-600" />
                      <span>1. Conceptual Breakdown</span>
                    </h3>
                    <div className="sile-prose bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 whitespace-pre-line text-sm sm:text-base leading-relaxed">
                      {adaptedExplanation}
                    </div>
                  </section>
                )}

                {/* Visual Representation (if present) */}
                {result.adapted_content.visual_representation && (
                  <section aria-labelledby="visual-rep-heading" className="space-y-3">
                    <h3 id="visual-rep-heading" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-brand-600" />
                      <span>Visual Representation & Model</span>
                    </h3>
                    <div className="bg-slate-900 text-brand-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 whitespace-pre">
                      {result.adapted_content.visual_representation}
                    </div>
                  </section>
                )}

                {/* 2. TRY: Step-by-Step Worked Examples */}
                {result.adapted_content.worked_examples && result.adapted_content.worked_examples.length > 0 && (
                  <section aria-labelledby="worked-examples-heading" className="space-y-4">
                    <h3 id="worked-examples-heading" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. Step-by-Step Worked Examples</span>
                    </h3>

                    <div className="space-y-4">
                      {result.adapted_content.worked_examples.map((example, exIdx) => {
                        const problemStatement = example.problem || example.problem_statement || '';
                        return (
                          <div
                            key={exIdx}
                            className="bg-white border-2 border-brand-100 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
                          >
                            <div className="border-b border-brand-50 pb-3">
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                {example.title || `Example ${exIdx + 1}`}
                              </h4>
                              {problemStatement && (
                                <p className="text-xs sm:text-sm text-slate-700 mt-1 font-medium bg-brand-50/60 p-3 rounded-xl">
                                  {problemStatement}
                                </p>
                              )}
                            </div>

                            <div className="space-y-3">
                              {renderWorkedExampleSteps(example)}
                            </div>

                            {example.conclusion && (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                                <span>💡</span>
                                <span>{example.conclusion}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Scaffolding & Study Strategies */}
                {scaffoldingNotes.length > 0 && (
                  <section aria-labelledby="scaffolding-heading" className="space-y-3">
                    <h3 id="scaffolding-heading" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Study Tips & Scaffolding Guidance</span>
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      {scaffoldingNotes.map((note, nIdx) => (
                        <li
                          key={nIdx}
                          className="flex items-start gap-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60"
                        >
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </article>
          )}

          {/* 3. CHECK: Formative Assessment Component */}
          {currentAssessmentQuestion && (
            <section
              aria-labelledby="formative-assessment-heading"
              className="bg-white rounded-3xl border-2 border-brand-200 shadow-card p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-600" />
                  <h3 id="formative-assessment-heading" className="text-lg sm:text-xl font-bold text-slate-900">
                    3. Formative Checkpoint
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">
                    {currentAssessmentQuestion.difficulty || 'Targeted'}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {currentAssessmentQuestion.question_type || 'Multiple Choice'}
                  </Badge>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                {currentAssessmentQuestion.question_text || currentAssessmentQuestion.question}
              </p>

              {/* Options */}
              {currentAssessmentQuestion.options && currentAssessmentQuestion.options.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="sr-only">Choose the correct answer</legend>
                  {currentAssessmentQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentAssessmentQuestion?.correct_answer;

                    let optionStyles = 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30';
                    if (isSelected && !answerSubmitted) {
                      optionStyles = 'border-brand-600 bg-brand-50 text-brand-900 shadow-xs ring-2 ring-brand-500/20';
                    } else if (answerSubmitted) {
                      if (isCorrect) {
                        optionStyles = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                      } else if (isSelected && !isCorrect) {
                        optionStyles = 'border-rose-500 bg-rose-50 text-rose-900';
                      } else {
                        optionStyles = 'border-slate-200 opacity-60';
                      }
                    }

                    return (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${optionStyles}`}
                      >
                        <input
                          type="radio"
                          name="assessment-option"
                          value={option}
                          checked={isSelected}
                          onChange={() => {
                            if (!answerSubmitted) {
                              setSelectedAnswer(option);
                            }
                          }}
                          disabled={answerSubmitted}
                          className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs sm:text-sm flex-1">{option}</span>
                        {answerSubmitted && isCorrect && (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                        {answerSubmitted && isSelected && !isCorrect && (
                          <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {/* Action Buttons */}
              {!answerSubmitted ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAssessmentSubmit}
                  disabled={!selectedAnswer}
                >
                  Check Answer
                </Button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div
                    tabIndex={0}
                    aria-live="polite"
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      selectedAnswer === currentAssessmentQuestion.correct_answer
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {selectedAnswer === currentAssessmentQuestion.correct_answer ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-xs sm:text-sm">
                        {selectedAnswer === currentAssessmentQuestion.correct_answer
                          ? 'Great job! That is correct.'
                          : 'Not quite. Here is why:'}
                      </p>
                      {currentAssessmentQuestion.explanation && (
                        <p className="text-xs sm:text-sm leading-relaxed">{currentAssessmentQuestion.explanation}</p>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Misconception Hint */}
                  {selectedAnswer !== currentAssessmentQuestion.correct_answer && (
                    <>
                      {currentAssessmentQuestion.distractor_rationales &&
                        currentAssessmentQuestion.distractor_rationales[selectedAnswer || ''] && (
                          <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 space-y-1">
                            <span className="font-bold">💡 Targeted Diagnostic Hint:</span>
                            <p>{currentAssessmentQuestion.distractor_rationales[selectedAnswer || '']}</p>
                          </div>
                        )}
                      {currentAssessmentQuestion.misconception_hints &&
                        currentAssessmentQuestion.misconception_hints[selectedAnswer || ''] && (
                          <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 space-y-1">
                            <span className="font-bold">💡 Targeted Diagnostic Hint:</span>
                            <p>{currentAssessmentQuestion.misconception_hints[selectedAnswer || '']}</p>
                          </div>
                        )}
                    </>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setAnswerSubmitted(false);
                    }}
                  >
                    Try Again ↺
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* 4. REFLECT: Plain Language Summary & Accessibility Aids */}
          {accessibilityData && (
            <section
              aria-labelledby="accessibility-summary-heading"
              className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 space-y-3"
            >
              <h3 id="accessibility-summary-heading" className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>♿</span>
                <span>4. Plain Language Summary & Accessibility Aids</span>
              </h3>
              {accessibilityData.plain_language_summary && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {accessibilityData.plain_language_summary}
                </p>
              )}

              {/* Accessible tags */}
              {accessibilityData.content_structure && accessibilityData.content_structure.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {accessibilityData.content_structure.map((item, idx) => (
                    <Badge key={idx} variant="default" size="sm">
                      ✓ {item}
                    </Badge>
                  ))}
                </div>
              )}

              {accessibilityData.applied_adaptations && accessibilityData.applied_adaptations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {accessibilityData.applied_adaptations.map((ad, idx) => (
                    <Badge key={idx} variant="default" size="sm">
                      ✓ {ad.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 5. Progressive Disclosure: "How SILE Adapted This Lesson" Research & Explainability Drawer */}
          <section className="border border-slate-200 rounded-2xl bg-white p-5 space-y-3">
            <button
              onClick={() => setShowResearchTrace((prev) => !prev)}
              className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
              aria-expanded={showResearchTrace}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Multi-Agent Execution Audit: How SILE adapted this lesson ({agentLogs.length} agents coordinated)
                </span>
              </div>
              {showResearchTrace ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showResearchTrace && (
              <div className="pt-3 border-t border-slate-100 space-y-4 text-xs animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-semibold mb-1">Session ID</div>
                    <div className="font-mono text-slate-800 font-bold truncate">
                      {result.session_id}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-semibold mb-1">Mastery Score</div>
                    <div className="font-bold text-brand-700">
                      {Math.round(masteryScoreVal * 100)}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-semibold mb-1">Detected Level</div>
                    <div className="font-bold text-emerald-700 uppercase">
                      {detectedMasteryLevel}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-semibold mb-1">Coordinated Agents</div>
                    <div className="font-bold text-slate-800">
                      {agentLogs.length} active
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700">Agent Interaction Audit Logs:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agentLogs.map((agent, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">
                          {String(agent.agent_name || 'Agent').replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-500">
                          {agent.latency_ms ?? 0}ms • {agent.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
};
