import { ContentDifficulty, ContentType } from './curriculum.types';

export type MasteryStatus = 'low' | 'developing' | 'good' | 'high';

export interface TopicPerformanceMetric {
  topic_id: string;
  topic_code: string;
  topic_name: string;
  subject_name: string;
  total_attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number;
  recent_accuracy: number;
  mastery_score: number;
  mastery_percentage: number;
  mastery_status: MasteryStatus;
  current_difficulty: ContentDifficulty;
  last_attempted_at?: string | null;
}

export interface LearnerPerformanceOverview {
  learner_id: string;
  full_name: string;
  overall_accuracy: number;
  overall_mastery: number;
  total_questions_attempted: number;
  strong_topics: TopicPerformanceMetric[];
  developing_topics: TopicPerformanceMetric[];
  weak_topics: TopicPerformanceMetric[];
  all_topics: TopicPerformanceMetric[];
  last_analyzed_at: string;
}

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecommendationStatus = 'pending' | 'accepted' | 'completed' | 'dismissed';

export interface RecommendationItem {
  id: string;
  topic_id: string;
  topic_name: string;
  topic_code: string;
  content_id?: string | null;
  content_title?: string | null;
  content_type?: ContentType | null;
  difficulty: ContentDifficulty;
  estimated_duration_minutes: number;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  reason: string;
  created_at: string;
}

export interface LearnerRecommendationsResponse {
  learner_id: string;
  total_recommendations: number;
  recommendations: RecommendationItem[];
  generated_at: string;
}

export type LearningPathStatus = 'not_started' | 'in_progress' | 'completed' | 'archived';
export type PathItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface LearningPathItem {
  id: string;
  learning_path_id: string;
  content_id: string;
  content_title: string;
  topic_id: string;
  topic_name: string;
  topic_code: string;
  difficulty: ContentDifficulty;
  content_type: ContentType;
  estimated_duration_minutes: number;
  sequence_number: number;
  status: PathItemStatus;
  completed_at?: string | null;
}

export interface LearningPath {
  id: string;
  learner_profile_id: string;
  subject_id?: string | null;
  subject_name?: string | null;
  title: string;
  description?: string | null;
  status: LearningPathStatus;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  total_estimated_duration_minutes: number;
  items: LearningPathItem[];
  created_at: string;
  updated_at: string;
}
