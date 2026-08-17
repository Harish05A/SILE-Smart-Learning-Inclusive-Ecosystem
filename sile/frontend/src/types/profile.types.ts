export type LearningPace = 'slow' | 'moderate' | 'fast';
export type PreferredContentType = 'text' | 'visual' | 'audio' | 'interactive' | 'mixed';

export interface LearningPreferencesData {
  id?: string;
  learner_profile_id?: string;
  visual_explanations: boolean;
  step_by_step: boolean;
  simplified_language: boolean;
  audio_support: boolean;
  interactive_learning: boolean;
  short_sessions: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AccessibilityPreferencesData {
  id?: string;
  learner_profile_id?: string;
  large_text: boolean;
  high_contrast: boolean;
  text_to_speech: boolean;
  reduced_visual_complexity: boolean;
  keyboard_navigation: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LearnerProfileData {
  id: string;
  user_id: string;
  full_name: string;
  age?: number | null;
  grade?: string | null;
  preferred_language: string;
  learning_pace: LearningPace;
  preferred_content_type: PreferredContentType;
  learning_preference?: LearningPreferencesData;
  accessibility_preference?: AccessibilityPreferencesData;
  created_at: string;
  updated_at: string;
}

export interface LearnerProfileUpdatePayload {
  full_name?: string;
  age?: number | null;
  grade?: string | null;
  preferred_language?: string;
  learning_pace?: LearningPace;
  preferred_content_type?: PreferredContentType;
  learning_preferences?: Partial<LearningPreferencesData>;
  accessibility_preferences?: Partial<AccessibilityPreferencesData>;
}
