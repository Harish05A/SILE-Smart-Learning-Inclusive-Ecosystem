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

  // Multi-agent generation visualization (client-side staged progress).
  // The backend /agents/coordinate call is a single blocking request, so we
  // animate the pipeline stages while it runs to visualize the agents working.
  const AGENT_STAGES = [
    {
      key: 'analysis',
      label: 'Learner Analysis Agent',
      detail: 'Reading mastery profile, weak & strong topics, and preferences',
      icon: Brain,
    },
    {
      key: 'adaptation',
      label: 'Content Adaptation Agent',
      detail: 'Rewriting the lesson with step-by-step visual scaffolding',
      icon: BookOpen,
    },
    {
      key: 'assessment',
      label: 'Assessment Agent',
      detail: 'Building a targeted checkpoint question for your gaps',
      icon: HelpCircle,
    },
    {
      key: 'accessibility',
      label: 'Accessibility Agent',
      detail: 'Applying plain-language summary and accessible formatting',
      icon: Eye,
    },
  ] as const;

  const [activeStage, setActiveStage] = useState<number>(0);

  useEffect(() => {
    if (!isCoordinating) {
      setActiveStage(0);
      return;
    }
    setActiveStage(0);
    // Advance through stages while the request is in flight. Hold on the last
    // stage until the real response resolves and clears isCoordinating.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stepDurations = [1200, 2200, 3400]; // ms offsets to reach stages 1,2,3
    stepDurations.forEach((delay, idx) => {
      timers.push(setTimeout(() => setActiveStage(idx + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [isCoordinating]);

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

  // Profile attributes the multi-agent pipeline actually used to personalize.
  const learnerCtx = result?.learner_context;
  const weakTopics = learnerCtx?.weak_topics || [];
  const strongTopics = learnerCtx?.strong_topics || [];
  const learningGaps = learnerCtx?.evidence_based_learning_gaps || [];
  const adaptationParams = learnerCtx?.adaptation_parameters || {};
  const appliedAccessibility =
    accessibilityData?.applied_adaptations || accessibilityData?.applied_features || [];

  // Turn the learning/accessibility preference maps into human-readable chips.
  const prettyKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const enabledPrefChips = Object.entries(learnerCtx?.learning_preferences || {})
    .filter(([, v]) => v === true)
    .map(([k]) => prettyKey(k));
  const enabledA11yChips = Object.entries(learnerCtx?.accessibility_preferences || {})
    .filter(([, v]) => v === true)
    .map(([k]) => prettyKey(k));

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

      {/* 4. Progressive Loading Feedback — Live Multi-Agent Pipeline Visualization */}
      {isCoordinating && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-card space-y-8 animate-fadeIn"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 bg-brand-50 rounded-2xl text-brand-600 shadow-subtle">
              <Sparkles className="w-9 h-9 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">
                Coordinating AI Agents for Your Lesson
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Four specialized agents are collaborating to personalize this lesson to your learner profile.
              </p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Pipeline progress</span>
              <span className="text-brand-700">
                Stage {Math.min(activeStage + 1, AGENT_STAGES.length)} of {AGENT_STAGES.length}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-700 ease-out"
                style={{
                  width: `${((Math.min(activeStage, AGENT_STAGES.length - 1) + 1) / AGENT_STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Per-agent staged pipeline */}
          <ol className="max-w-2xl mx-auto space-y-3">
            {AGENT_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const status =
                idx < activeStage ? 'done' : idx === activeStage ? 'active' : 'pending';
              return (
                <li
                  key={stage.key}
                  className={[
                    'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500',
                    status === 'active'
                      ? 'bg-brand-50 border-brand-300 shadow-subtle scale-[1.01]'
                      : status === 'done'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 opacity-70',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                      status === 'active'
                        ? 'bg-brand-600 text-white'
                        : status === 'done'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500',
                    ].join(' ')}
                  >
                    {status === 'done' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : status === 'active' ? (
                      <StageIcon className="w-5 h-5 animate-bounce" />
                    ) : (
                      <StageIcon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'text-sm font-bold truncate',
                          status === 'pending' ? 'text-slate-500' : 'text-slate-900',
                        ].join(' ')}
                      >
                        {stage.label}
                      </span>
                      {status === 'active' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                          Working
                        </span>
                      )}
                      {status === 'done' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{stage.detail}</p>
                  </div>

                  {status === 'active' && (
                    <RefreshCw className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" />
                  )}
                </li>
              );
            })}
          </ol>

          <p className="text-center text-[11px] text-slate-400 max-w-md mx-auto">
            Each agent writes an audited interaction log. You can review the full execution trace after the lesson is generated.
          </p>
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

          {/* Personalization Basis — what the agents used from THIS learner's profile */}
          <section
            aria-labelledby="personalization-basis-heading"
            className="bg-white rounded-3xl border border-brand-200/70 shadow-card overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-3 bg-brand-50 border-b border-brand-200/70 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3
                id="personalization-basis-heading"
                className="text-xs sm:text-sm font-bold text-brand-800"
              >
                Personalized from this learner&apos;s profile
              </h3>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Profile-driven ✓
              </span>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
              {/* Pace / mode / difficulty */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {adaptationParams.pace && (
                    <Badge variant="brand" size="sm">Pace: {prettyKey(String(adaptationParams.pace))}</Badge>
                  )}
                  {adaptationParams.preferred_mode && (
                    <Badge variant="brand" size="sm">
                      Mode: {prettyKey(String(adaptationParams.preferred_mode))}
                    </Badge>
                  )}
                  <Badge variant="default" size="sm">
                    Level: {learnerCtx?.recommended_difficulty ? prettyKey(String(learnerCtx.recommended_difficulty)) : difficultyRating}
                  </Badge>
                  <Badge variant="default" size="sm">
                    Mastery: {Math.round(masteryScoreVal * 100)}%
                  </Badge>
                </div>

                {strongTopics.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {strongTopics.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {weakTopics.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Focus Areas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weakTopics.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences the agents honored */}
              <div className="space-y-3">
                {enabledPrefChips.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Learning preferences applied
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enabledPrefChips.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-medium"
                        >
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(enabledA11yChips.length > 0 || appliedAccessibility.length > 0) && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Accessibility adaptations
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(appliedAccessibility.length > 0 ? appliedAccessibility.map(prettyKey) : enabledA11yChips).map(
                        (c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                          >
                            ♿ {c}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence-based gaps that drove the adaptation */}
              {learningGaps.length > 0 && (
                <div className="md:col-span-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Evidence used
                  </div>
                  <ul className="space-y-1">
                    {learningGaps.slice(0, 3).map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600">
                        <span className="text-brand-500 mt-0.5">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

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
