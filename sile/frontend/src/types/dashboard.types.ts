import { LearningPace, PreferredContentType } from './profile.types';
import { LearningLevel } from './assessment.types';

export interface DashboardProfileSummary {
  full_name: string;
  age?: number | null;
  grade?: string | null;
  preferred_language: string;
  learning_pace: LearningPace;
  preferred_content_type: PreferredContentType;
}

export interface DashboardLearningPreferencesSummary {
  visual_explanations: boolean;
  step_by_step: boolean;
  simplified_language: boolean;
  audio_support: boolean;
  interactive_learning: boolean;
  short_sessions: boolean;
}

export interface DashboardAccessibilityPreferencesSummary {
  large_text: boolean;
  high_contrast: boolean;
  text_to_speech: boolean;
  reduced_visual_complexity: boolean;
  keyboard_navigation: boolean;
}

export interface AssessmentHistoryItem {
  attempt_id: string;
  assessment_id: string;
  assessment_title: string;
  subject: string;
  score: number;
  total_questions: number;
  percentage: number;
  learning_level: LearningLevel;
  completed_at: string;
}

export interface DashboardOverviewData {
  user_id: string;
  email: string;
  full_name: string;
  profile_completion_percentage: number;
  profile: DashboardProfileSummary;
  learning_preferences: DashboardLearningPreferencesSummary;
  accessibility_preferences: DashboardAccessibilityPreferencesSummary;
  baseline_status: 'completed' | 'not_started';
  latest_assessment?: AssessmentHistoryItem | null;
  assessment_history: AssessmentHistoryItem[];
  active_assessment_id?: string | null;
}
