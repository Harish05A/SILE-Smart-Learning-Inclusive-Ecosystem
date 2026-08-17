import { apiClient } from './api.client';
import { LearnerProfileData, LearnerProfileUpdatePayload } from '../types/profile.types';

export const profileService = {
  getProfile: async (): Promise<LearnerProfileData> => {
    const response = await apiClient.get<LearnerProfileData>('/learner/profile');
    return response.data;
  },

  updateProfile: async (payload: LearnerProfileUpdatePayload): Promise<LearnerProfileData> => {
    const response = await apiClient.put<LearnerProfileData>('/learner/profile', payload);
    return response.data;
  },
};
