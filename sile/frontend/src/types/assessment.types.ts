export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LearningLevel = 'Beginner' | 'Developing' | 'Proficient';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface AssessmentQuestionPublic {
  id: string;
  question_text: string;
  options: QuestionOption[];
  difficulty: QuestionDifficulty;
  order_number: number;
}

export interface AssessmentListItem {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  total_questions: number;
  created_at: string;
}

export interface AssessmentDetail {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  total_questions: number;
  questions: AssessmentQuestionPublic[];
}

export interface QuestionAnswerSubmitItem {
  question_id: string;
  selected_answer: string;
}

export interface AssessmentAttemptSubmitPayload {
  answers: QuestionAnswerSubmitItem[];
}

export interface AssessmentAnswerDetail {
  question_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

export interface AssessmentAttemptResult {
  attempt_id: string;
  assessment_id: string;
  assessment_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  learning_level: LearningLevel;
  correct_count: number;
  incorrect_count: number;
  completed_at: string;
  answers_summary: AssessmentAnswerDetail[];
}

export type AssessmentResult = AssessmentAttemptResult;
