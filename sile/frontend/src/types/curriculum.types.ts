export type ContentDifficulty = 'beginner' | 'developing' | 'proficient' | 'advanced';

export type ContentType = 'explanation' | 'example' | 'video' | 'practice' | 'quiz';

export interface Skill {
  id: string;
  topic_id: string;
  name: string;
  description?: string | null;
  difficulty_level: ContentDifficulty;
  order_number: number;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  prerequisite_topic_id?: string | null;
  code: string;
  name: string;
  description?: string | null;
  order_number: number;
  skills_count: number;
  contents_count: number;
  skills?: Skill[];
  created_at: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  order_number: number;
  topics_count: number;
  topics?: Topic[];
  created_at: string;
}

export interface LearningContentSummary {
  id: string;
  subject_id: string;
  subject_name?: string | null;
  topic_id: string;
  topic_name?: string | null;
  skill_id?: string | null;
  skill_name?: string | null;
  title: string;
  description?: string | null;
  content_type: ContentType;
  difficulty_level: ContentDifficulty;
  estimated_duration_minutes: number;
  prerequisites?: string[] | null;
  created_at: string;
}

export interface LearningContentDetail extends LearningContentSummary {
  content_body: string;
  media_payload?: any;
  updated_at: string;
}
