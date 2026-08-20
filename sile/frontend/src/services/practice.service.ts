import { apiClient } from './api.client';
import {
  PracticeSession,
  SubmitPracticeRequest,
  PracticeResult,
} from '../types/practice.types';

export const practiceService = {
  async generatePracticeSession(
    topicId: string,
    numQuestions: number = 5
  ): Promise<PracticeSession> {
    const response = await apiClient.post<PracticeSession>('/practice/generate', {
      topic_id: topicId,
      num_questions: numQuestions,
    });
    return response.data;
  },

  async submitPracticeSession(payload: SubmitPracticeRequest): Promise<PracticeResult> {
    const response = await apiClient.post<PracticeResult>('/practice/submit', payload);
    return response.data;
  },
};
