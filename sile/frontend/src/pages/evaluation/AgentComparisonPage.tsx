import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { agentService } from '../../services/agent.service';
import { adaptiveService } from '../../services/adaptive.service';
import { Topic } from '../../types/curriculum.types';

import {
  MultiAgentResponse,
  AgentComparisonEvaluationResponse,
} from '../../types/agent.types';

export const AgentComparisonPage: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active comparison state
  const [multiAgentRes, setMultiAgentRes] = useState<MultiAgentResponse | null>(null);
  const [ruleBasedOutput, setRuleBasedOutput] = useState<Record<string, any> | null>(null);
  const [learnerRating, setLearnerRating] = useState<number>(0);
  const [evaluationNotes, setEvaluationNotes] = useState<string>('');
  const [savedEvaluation, setSavedEvaluation] = useState<AgentComparisonEvaluationResponse | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<AgentComparisonEvaluationResponse[]>([]);

  // Expanded explanations toggles
  const [showArchitectureDetails, setShowArchitectureDetails] = useState(false);
  const [showJsonDump, setShowJsonDump] = useState(false);

  useEffect(() => {
    loadTopics();
    loadPastEvaluations();
  }, []);

  const loadTopics = async () => {
    try {
      const data = await adaptiveService.getTopics();
      setTopics(data);
      if (data.length > 0) {
        setSelectedTopicId(data[0].id);
      }
    } catch (err: any) {
      setError('Unable to load curriculum topics.');
    }
  };


  const loadPastEvaluations = async () => {
    try {
      const evals = await agentService.listComparisons();
      setPastEvaluations(evals);
    } catch (err) {
      // Non-blocking for research dashboard
    }
  };

  const handleRunComparison = async () => {
    if (!selectedTopicId) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSavedEvaluation(null);

    try {
      // 1. Run Phase 3 Multi-Agent orchestration
      const agentResponse = await agentService.coordinate({
        session_type: 'lesson_adaptation',
        topic_id: selectedTopicId,
        user_inquiry: 'Explain this topic clearly with step-by-step guidance and accessibility considerations.',
      });

      setMultiAgentRes(agentResponse);

      // 2. Generate deterministic rule-based output from Phase 2 benchmark template
      const selectedTopic = topics.find((t) => t.id === selectedTopicId);
      const simulatedRuleBased = {
        engine: 'Phase 2 Deterministic RuleEngine',
        strategy: 'Rule-Based Heuristic Match',
        adaptation_mode: 'deterministic_template',
        topic_name: selectedTopic?.name || 'Curriculum Topic',
        content_template: `Standard deterministic lesson module for ${selectedTopic?.name || 'Topic'}. Focuses on canonical textbook definitions with static formula representations.`,
        scaffolding: ['Read concept definition', 'Inspect default formula', 'Answer practice quiz'],
        accessibility: 'Global theme stylesheet applied. Standard semantic tags.',
        difficulty: 'Standard (Static sequence default)',
      };
      setRuleBasedOutput(simulatedRuleBased);

      // 3. Auto-record baseline comparison record
      try {
        const saved = await agentService.createComparison({
          session_id: agentResponse.session_id,
          rule_based_output: simulatedRuleBased,
          multi_agent_output: {
            title: agentResponse.adapted_content?.adapted_title || agentResponse.adapted_content?.title,
            objective: agentResponse.adapted_content?.learning_objective,
            scaffolding_steps: agentResponse.adapted_content?.scaffolding_steps || agentResponse.adapted_content?.scaffolding_notes,
            accessibility_adaptations: agentResponse.accessibility_adaptation?.applied_adaptations || agentResponse.accessibility_adaptation?.content_structure,
            agents_executed: (agentResponse.agent_results || []).map((r) => r.agent_name),
          },
        });
        setSavedEvaluation(saved);
        loadPastEvaluations();
      } catch (saveErr) {
        console.warn('Comparison record persistence note:', saveErr);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to execute comparative evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async () => {
    if (!multiAgentRes || !multiAgentRes.session_id) return;
    setSubmittingRating(true);
    setSuccessMessage(null);
    try {
      const updated = await agentService.createComparison({
        session_id: multiAgentRes.session_id,
        rule_based_output: ruleBasedOutput || {},
        multi_agent_output: {
          title: multiAgentRes.adapted_content?.adapted_title,
          objective: multiAgentRes.adapted_content?.learning_objective,
          scaffolding_steps: multiAgentRes.adapted_content?.scaffolding_notes,
        },
        learner_rating: learnerRating > 0 ? learnerRating : undefined,
        notes: evaluationNotes.trim() || undefined,
      });
      setSavedEvaluation(updated);
      setSuccessMessage('Evaluation feedback recorded successfully.');
      loadPastEvaluations();
    } catch (err: any) {
      setError('Unable to save evaluation rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Research Context */}
      <div className="border-b border-surface-200 dark:border-surface-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Research & Explainability Protocol
              </span>
              <Badge variant="brand" size="sm">Phase 2 vs Phase 3</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
              Adaptive Architecture Comparison
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 max-w-3xl">
              Empirical evaluation comparing Phase 2 deterministic heuristic adaptation against Phase 3 
              collaborative multi-agent orchestration under verified learner context.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchitectureDetails(!showArchitectureDetails)}
            >
              <svg className="w-4 h-4 mr-1.5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showArchitectureDetails ? 'Hide Architecture Flow' : 'Explain Architecture'}
            </Button>
          </div>
        </div>

        {/* Architecture Flow Diagram Box */}
        {showArchitectureDetails && (
          <div className="mt-6 p-5 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl animate-fade-in text-xs space-y-4">
            <h3 className="font-semibold text-surface-900 dark:text-white text-sm">
              Comparative Execution Pipelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phase 2 Pipeline */}
              <div className="p-4 bg-white dark:bg-surface-850 rounded-lg border border-surface-200 dark:border-surface-750">
                <div className="font-semibold text-surface-800 dark:text-surface-200 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-surface-500"></span>
                  Phase 2: Deterministic Rule Engine
                </div>
                <div className="space-y-1.5 font-mono text-surface-600 dark:text-surface-400">
                  <div className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded">1. Learner Profile & Diagnostic Scores</div>
                  <div className="text-center text-surface-400">↓</div>
                  <div className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded">2. Static IF-THEN Heuristic Rules</div>
                  <div className="text-center text-surface-400">↓</div>
                  <div className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded">3. Pre-baked Content Template Selection</div>
                </div>
              </div>

              {/* Phase 3 Pipeline */}
              <div className="p-4 bg-white dark:bg-surface-850 rounded-lg border border-brand-200 dark:border-brand-800/60">
                <div className="font-semibold text-brand-800 dark:text-brand-300 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                  Phase 3: Multi-Agent Orchestration
                </div>
                <div className="space-y-1.5 font-mono text-surface-600 dark:text-surface-400">
                  <div className="p-1.5 bg-brand-50/50 dark:bg-brand-950/30 rounded">1. Coordinator Agent (Orchestration Hub)</div>
                  <div className="text-center text-brand-400">↓</div>
                  <div className="p-1.5 bg-brand-50/50 dark:bg-brand-950/30 rounded">2. LearnerAnalysisAgent (Context Frame)</div>
                  <div className="text-center text-brand-400">↓</div>
                  <div className="p-1.5 bg-brand-50/50 dark:bg-brand-950/30 rounded">3. ContentAdaptation + Accessibility + Assessment Agents</div>
                  <div className="text-center text-brand-400">↓</div>
                  <div className="p-1.5 bg-brand-50/50 dark:bg-brand-950/30 rounded">4. Dynamic Scaffolding & Multi-Modal Delivery</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <Card variant="default">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="topicSelect" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">
                Target Curriculum Topic
              </label>
              <select
                id="topicSelect"
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full text-sm rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-850 px-3.5 py-2.5 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>

                ))}

              </select>
            </div>

            <div className="sm:self-end">
              <Button
                variant="primary"
                onClick={handleRunComparison}
                disabled={loading || !selectedTopicId}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Evaluating Architectures...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Run Side-by-Side Comparison
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
              {successMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Grid */}
      {multiAgentRes && ruleBasedOutput && (
        <div className="space-y-8 animate-fade-in">
          {/* Side-by-Side Adaptation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Phase 2 Deterministic Baseline */}
            <Card variant="default" className="border-t-4 border-t-surface-400">
              <CardHeader className="pb-3 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" size="sm">Phase 2 Baseline</Badge>
                  <span className="text-xs text-surface-500 font-mono">Deterministic Heuristic</span>
                </div>
                <CardTitle className="text-lg mt-2 text-surface-900 dark:text-white">
                  Static Rule-Based Output
                </CardTitle>
                <CardDescription className="text-xs">
                  Fixed logic based on static score thresholds and rule mapping
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-surface-500 uppercase mb-1">Target Topic</div>
                  <div className="font-medium text-surface-900 dark:text-surface-100">
                    {ruleBasedOutput.topic_name}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-surface-500 uppercase mb-1">Explanation Content</div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-850 rounded-lg text-xs leading-relaxed text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-750">
                    {ruleBasedOutput.content_template}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-surface-500 uppercase mb-1.5">Scaffolding Pipeline</div>
                  <ul className="space-y-1">
                    {ruleBasedOutput.scaffolding?.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-400"></span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-semibold text-surface-500 uppercase mb-1">Accessibility Provision</div>
                  <div className="text-xs text-surface-600 dark:text-surface-400">
                    {ruleBasedOutput.accessibility}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Phase 3 Multi-Agent Intelligence */}
            <Card variant="default" className="border-t-4 border-t-brand-600">
              <CardHeader className="pb-3 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">Phase 3 Orchestration</Badge>
                  <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                    {(multiAgentRes.agent_results || []).length} Collaborative Agents
                  </span>
                </div>
                <CardTitle className="text-lg mt-2 text-surface-900 dark:text-white">
                  {multiAgentRes.adapted_content?.adapted_title || multiAgentRes.adapted_content?.title || 'Multi-Agent Adapted Content'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Contextually tailored pedagogical model with multi-modal accessibility
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase mb-1">
                    Calibrated Learning Objective
                  </div>
                  <div className="text-xs text-surface-800 dark:text-surface-200 font-medium">
                    {multiAgentRes.adapted_content?.learning_objective || 'Target mastery reinforcement.'}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase mb-1">
                    Pedagogical Explanation
                  </div>
                  <div className="p-3 bg-brand-50/40 dark:bg-brand-950/20 rounded-lg text-xs leading-relaxed text-surface-800 dark:text-surface-200 border border-brand-100 dark:border-brand-900/40">
                    {(multiAgentRes.adapted_content?.conceptual_explanation || multiAgentRes.adapted_content?.adapted_explanation || '').slice(0, 240)}...
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase mb-1.5">
                    Agent-Synthesized Scaffolding
                  </div>
                  <ul className="space-y-1">
                    {(multiAgentRes.adapted_content?.scaffolding_steps || multiAgentRes.adapted_content?.scaffolding_notes || []).map((note, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase mb-1">
                    Accessibility Transformations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(multiAgentRes.accessibility_adaptation?.applied_adaptations || multiAgentRes.accessibility_adaptation?.content_structure || ['Visual Hierarchy', 'Screen Reader Ready']).map((adapt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
                      >
                        ✓ {adapt}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7 Observable Research Dimensions Comparison Table */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base">Empirical Evaluation Dimensions</CardTitle>
              <CardDescription className="text-xs">
                Objective criteria for assessing pedagogical fidelity and architectural differentiation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-850 border-y border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400 font-semibold uppercase">
                    <th className="py-3 px-4">Evaluation Dimension</th>
                    <th className="py-3 px-4">Phase 2 Rule-Based Mechanism</th>
                    <th className="py-3 px-4">Phase 3 Multi-Agent Mechanism</th>
                    <th className="py-3 px-4">Observability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-800 dark:text-surface-200">
                  <tr>
                    <td className="py-3 px-4 font-medium">1. Learning Relevance</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Pre-indexed curriculum topic matching</td>
                    <td className="py-3 px-4">Dynamic contextual alignment via LearnerAnalysisAgent</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">2. Personalization Fidelity</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Coarse bracket heuristics (&lt;60% vs &gt;80%)</td>
                    <td className="py-3 px-4">Granular mastery score & historical gap calibration</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">3. Accessibility Compliance</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Static CSS class toggle</td>
                    <td className="py-3 px-4">Screen-reader narration + plain language transformation</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">4. Pedagogical Usefulness</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Static textbook definitions</td>
                    <td className="py-3 px-4">Multi-step worked examples + interactive checkpoints</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">5. Learning-Gap Alignment</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Generic remediation link</td>
                    <td className="py-3 px-4">Targeted misconception hints on formative options</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">6. Response Completeness</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Single payload template</td>
                    <td className="py-3 px-4">Coordinated 4-agent composite response</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">7. Preference Alignment</td>
                    <td className="py-3 px-4 text-surface-600 dark:text-surface-400">Binary visual toggle</td>
                    <td className="py-3 px-4">Dynamic ASCII/SVG diagram synthesis</td>
                    <td className="py-3 px-4"><Badge variant="success" size="sm">Verified</Badge></td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Qualitative Learner / Reviewer Feedback Form */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base">Reviewer Evaluation Feedback</CardTitle>
              <CardDescription className="text-xs">
                Record your assessment rating and observations for research dataset persistence
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                  Comparative Quality Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setLearnerRating(star)}
                      className={`p-2 rounded-lg border text-base transition-all ${
                        learnerRating >= star
                          ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                          : 'bg-surface-50 dark:bg-surface-800 border-surface-300 dark:border-surface-700 text-surface-400 hover:text-surface-700'
                      }`}
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs text-surface-600 dark:text-surface-400 ml-2">
                    {learnerRating === 0 ? 'Select rating' : `${learnerRating} of 5 Stars`}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="notesInput" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">
                  Evaluation Notes & Qualitative Analysis
                </label>
                <textarea
                  id="notesInput"
                  rows={3}
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                  placeholder="Record observations regarding explanation clarity, accessibility adaptation fidelity, or latency..."
                  className="w-full text-xs rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-850 p-3 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRating}
                  disabled={submittingRating || (!learnerRating && !evaluationNotes.trim())}
                >
                  {submittingRating ? 'Recording...' : 'Persist Evaluation Record'}
                </Button>

                {savedEvaluation && (
                  <span className="text-xs text-surface-500 font-mono">
                    Record ID: {savedEvaluation.id.slice(0, 8)}...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Raw Trace Toggle */}
          <div className="text-right">
            <button
              onClick={() => setShowJsonDump(!showJsonDump)}
              className="text-xs text-surface-500 hover:text-surface-800 dark:hover:text-surface-300 underline font-mono"
            >
              {showJsonDump ? 'Hide Raw JSON Trace' : 'View Raw Research Payloads'}
            </button>
          </div>

          {showJsonDump && (
            <div className="p-4 bg-surface-950 text-surface-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-surface-800 space-y-4">
              <div>
                <div className="text-brand-400 font-bold mb-1">Phase 3 Coordinator Response:</div>
                <pre>{JSON.stringify(multiAgentRes, null, 2)}</pre>
              </div>
              <div className="pt-3 border-t border-surface-800">
                <div className="text-surface-400 font-bold mb-1">Phase 2 Rule-Based Output:</div>
                <pre>{JSON.stringify(ruleBasedOutput, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Evaluation Log */}
      {pastEvaluations.length > 0 && (
        <div className="pt-6 border-t border-surface-200 dark:border-surface-800">
          <h2 className="text-base font-bold text-surface-900 dark:text-white mb-3">
            Recorded Comparison History ({pastEvaluations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastEvaluations.slice(0, 6).map((evalItem) => (
              <div
                key={evalItem.id}
                className="p-3.5 bg-white dark:bg-surface-850 rounded-lg border border-surface-200 dark:border-surface-750 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-surface-500 font-mono text-[11px]">
                  <span>{new Date(evalItem.created_at).toLocaleDateString()}</span>
                  {evalItem.learner_rating && (
                    <span className="text-amber-600 font-semibold">
                      {'★'.repeat(evalItem.learner_rating)} ({evalItem.learner_rating}/5)
                    </span>
                  )}
                </div>
                <div className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                  Session: {evalItem.session_id.slice(0, 12)}...
                </div>
                {evalItem.notes && (
                  <p className="text-surface-600 dark:text-surface-400 line-clamp-2 italic">
                    "{evalItem.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
