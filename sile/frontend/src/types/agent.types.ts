export type AgentSessionType =
  | 'lesson_adaptation'
  | 'formative_assessment'
  | 'interactive_tutoring'
  | 'explanation_simplification';

export interface AgentSessionCreate {
  session_type: AgentSessionType;
  topic_id?: string;
  content_id?: string;
  user_inquiry?: string;
}

export interface LearnerContextFrame {
  learner_level?: string;
  overall_mastery?: number;
  mastery_score?: number;
  detected_mastery_level?: string;
  weak_topics?: string[];
  strong_topics?: string[];
  recent_performance_summary?: string;
  learning_preferences?: Record<string, any>;
  accessibility_preferences?: Record<string, any>;
  recommended_difficulty?: string;
  visual_support_needed?: boolean;
  step_by_step_scaffolding?: boolean;
  evidence_based_learning_gaps?: string[];
  prerequisite_blockers?: string[];
  adaptation_parameters?: Record<string, any>;
  session_type?: string;
  target_topic_id?: string;
  target_content_id?: string;
  user_inquiry?: string;
  metadata?: Record<string, any>;
}

export interface WorkedExampleStep {
  step_number?: number;
  explanation?: string;
  math_or_code?: string;
}

export interface WorkedExample {
  title?: string;
  problem?: string;
  problem_statement?: string;
  solution_steps?: string[];
  steps?: (WorkedExampleStep | string)[];
  explanation?: string;
  conclusion?: string;
}

export interface ContentAdaptationResult {
  title?: string;
  adapted_title?: string;
  learning_objective?: string;
  conceptual_explanation?: string;
  adapted_explanation?: string;
  key_concepts?: string[];
  worked_examples?: WorkedExample[];
  scaffolding_steps?: string[];
  scaffolding_notes?: string[];
  visual_representation?: string;
  complexity_level?: string;
  difficulty_rating?: string;
  adaptation_rationale?: string;
  metadata?: Record<string, any>;
}

export interface AssessmentQuestionResult {
  question_id?: string;
  topic_id?: string;
  question?: string;
  question_text?: string;
  question_type?: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  targeted_learning_gap?: string;
  distractor_rationales?: Record<string, string>;
  misconception_hints?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AccessibilityAdaptationResult {
  accessible_content?: string;
  plain_language_summary?: string;
  content_structure?: string[];
  recommended_presentation?: Record<string, any>;
  accessibility_rationale?: string;
  screen_reader_optimized_text?: string;
  high_contrast_layout_ready?: boolean;
  font_scaling_compatible?: boolean;
  applied_adaptations?: string[];
  applied_features?: string[];
  metadata?: Record<string, any>;
}

export interface AgentInteractionLog {
  agent_name: string;
  status: string;
  output?: Record<string, any>;
  execution_mode?: string;
  latency_ms?: number;
  execution_order?: number;
  error_message?: string;
}

export interface MultiAgentResponse {
  session_id: string;
  session_type?: string;
  status?: string;
  learner_context: LearnerContextFrame;
  adapted_content?: ContentAdaptationResult;
  assessment?: AssessmentQuestionResult | AssessmentQuestionResult[];
  accessibility_adaptation?: AccessibilityAdaptationResult;
  accessibility?: AccessibilityAdaptationResult;
  agent_results?: AgentInteractionLog[];
  execution_trace?: AgentInteractionLog[];
  execution_summary?: string | Record<string, any>;
}

export interface AgentComparisonEvaluationCreate {
  session_id: string;
  rule_based_output?: Record<string, any>;
  multi_agent_output?: Record<string, any>;
  learner_rating?: number;
  notes?: string;
}

export interface AgentComparisonEvaluationResponse {
  id: string;
  session_id: string;
  rule_based_output: Record<string, any>;
  multi_agent_output: Record<string, any>;
  learner_rating?: number;
  notes?: string;
  created_at: string;
}
