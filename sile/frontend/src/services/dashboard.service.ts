import { apiClient } from './api.client';
import { DashboardOverviewData } from '../types/dashboard.types';

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverviewData> => {
    const response = await apiClient.get<DashboardOverviewData>('/dashboard/overview');
    return response.data;
  },
};
