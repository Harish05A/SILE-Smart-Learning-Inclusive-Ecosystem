import { apiClient } from './api.client';
import {
  AgentSessionCreate,
  MultiAgentResponse,
  AgentComparisonEvaluationCreate,
  AgentComparisonEvaluationResponse,
} from '../types/agent.types';

export const agentService = {
  /**
   * Request multi-agent orchestration via Coordinator Agent.
   * Dispatches task through POST /api/v1/agents/coordinate.
   */
  async coordinate(payload: AgentSessionCreate): Promise<MultiAgentResponse> {
    const response = await apiClient.post<MultiAgentResponse>('/agents/coordinate', payload);
    return response.data;
  },

  /**
   * Create or update a rule-based vs multi-agent comparison evaluation record.
   */
  async createComparison(payload: AgentComparisonEvaluationCreate): Promise<AgentComparisonEvaluationResponse> {
    const response = await apiClient.post<AgentComparisonEvaluationResponse>('/agents/comparisons', payload);
    return response.data;
  },

  /**
   * List recorded comparison evaluation records.
   */
  async listComparisons(): Promise<AgentComparisonEvaluationResponse[]> {
    const response = await apiClient.get<AgentComparisonEvaluationResponse[]>('/agents/comparisons');
    return response.data;
  },

  /**
   * Get a specific comparison evaluation record by session ID.
   */
  async getComparison(sessionId: string): Promise<AgentComparisonEvaluationResponse> {
    const response = await apiClient.get<AgentComparisonEvaluationResponse>(`/agents/comparisons/${sessionId}`);
    return response.data;
  },
};

