import { apiClient } from './api.client';
import { LearningPreference } from '../types/preference.types';
import { AccessibilityPreference } from '../types/accessibility.types';

export const preferenceService = {
  async getLearningPreferences(): Promise<LearningPreference> {
    const res = await apiClient.get<LearningPreference>('/preferences/learning');
    return res.data;
  },

  async updateLearningPreferences(data: Partial<LearningPreference>): Promise<LearningPreference> {
    const res = await apiClient.put<LearningPreference>('/preferences/learning', data);
    return res.data;
  },

  async getAccessibilityPreferences(): Promise<AccessibilityPreference> {
    const res = await apiClient.get<AccessibilityPreference>('/preferences/accessibility');
    return res.data;
  },

  async updateAccessibilityPreferences(data: Partial<AccessibilityPreference>): Promise<AccessibilityPreference> {
    const res = await apiClient.put<AccessibilityPreference>('/preferences/accessibility', data);
    return res.data;
  }
};
