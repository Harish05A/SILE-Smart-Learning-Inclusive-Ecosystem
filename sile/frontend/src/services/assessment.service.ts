import { apiClient } from './api.client';
import {
  AssessmentListItem,
  AssessmentDetail,
  AssessmentAttemptSubmitPayload,
  AssessmentAttemptResult,
} from '../types/assessment.types';

export const assessmentService = {
  listAssessments: async (): Promise<AssessmentListItem[]> => {
    const response = await apiClient.get<AssessmentListItem[]>('/assessments');
    return response.data;
  },

  getAssessmentById: async (id: string): Promise<AssessmentDetail> => {
    const response = await apiClient.get<AssessmentDetail>(`/assessments/${id}`);
    return response.data;
  },

  submitAttempt: async (
    id: string,
    payload: AssessmentAttemptSubmitPayload
  ): Promise<AssessmentAttemptResult> => {
    const response = await apiClient.post<AssessmentAttemptResult>(
      `/assessments/${id}/attempt`,
      payload
    );
    return response.data;
  },
};
