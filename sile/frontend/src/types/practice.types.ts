import { ContentDifficulty } from './curriculum.types';
import { MasteryStatus } from './adaptive.types';

export interface PracticeQuestionOption {
  key: string;
  text: string;
}

export interface PracticeQuestion {
  id: string;
  topic_id: string;
  topic_name: string;
  topic_code: string;
  question_text: string;
  options: PracticeQuestionOption[];
  difficulty: ContentDifficulty;
  hint?: string | null;
  order_number: number;
}

export interface PracticeSession {
  topic_id: string;
  topic_name: string;
  topic_code: string;
  calibrated_difficulty: ContentDifficulty;
  mastery_percentage: number;
  total_questions: number;
  questions: PracticeQuestion[];
}

export interface PracticeAnswerSubmission {
  question_id: string;
  selected_answer: string;
}

export interface SubmitPracticeRequest {
  topic_id: string;
  content_id?: string | null;
  answers: PracticeAnswerSubmission[];
}

export interface QuestionReviewItem {
  question_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string | null;
}

export interface PracticeResult {
  attempt_id: string;
  topic_id: string;
  topic_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  difficulty: ContentDifficulty;
  previous_mastery: number;
  updated_mastery: number;
  mastery_status: MasteryStatus;
  difficulty_adjusted_to: ContentDifficulty;
  recommended_next_action: string;
  next_content_id?: string | null;
  reviews: QuestionReviewItem[];
  completed_at: string;
}
