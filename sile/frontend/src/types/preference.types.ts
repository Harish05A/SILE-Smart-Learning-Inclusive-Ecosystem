export type LearningStyle = 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic' | 'multimodal';
export type LearningPace = 'relaxed' | 'moderate' | 'intensive';

export interface LearningPreference {
  id: string;
  learner_profile_id: string;
  primary_learning_style: LearningStyle;
  learning_pace: LearningPace;
  preferred_content_types?: string;
  session_duration_minutes: number;
  reminder_notifications: boolean;
}
