import { apiClient } from './api.client';
import {
  Subject,
  Topic,
  LearningContentSummary,
  LearningContentDetail,
  ContentDifficulty,
  ContentType,
} from '../types/curriculum.types';
import {
  LearnerPerformanceOverview,
  LearnerRecommendationsResponse,
  LearningPath,
  PathItemStatus,
} from '../types/adaptive.types';

export const adaptiveService = {
  // Performance Analytics
  async getPerformance(): Promise<LearnerPerformanceOverview> {
    const response = await apiClient.get<LearnerPerformanceOverview>('/learners/me/performance');
    return response.data;
  },

  // Rule-Based Recommendations
  async getRecommendations(limit: number = 5): Promise<LearnerRecommendationsResponse> {
    const response = await apiClient.get<LearnerRecommendationsResponse>(
      `/learners/me/recommendations?limit=${limit}`
    );
    return response.data;
  },

  // Learning Paths
  async getLearningPaths(): Promise<LearningPath[]> {
    const response = await apiClient.get<LearningPath[]>('/learners/me/learning-paths');
    return response.data;
  },

  async getLearningPathById(pathId: string): Promise<LearningPath> {
    const response = await apiClient.get<LearningPath>(`/learners/me/learning-paths/${pathId}`);
    return response.data;
  },

  async generateLearningPath(maxItems: number = 8, subjectId?: string): Promise<LearningPath> {
    const response = await apiClient.post<LearningPath>('/learners/me/learning-paths/generate', {
      max_items: maxItems,
      subject_id: subjectId,
    });
    return response.data;
  },

  async updatePathItemStatus(
    pathId: string,
    itemId: string,
    status: PathItemStatus
  ): Promise<LearningPath> {
    const response = await apiClient.patch<LearningPath>(
      `/learners/me/learning-paths/${pathId}/items/${itemId}`,
      { status }
    );
    return response.data;
  },

  // Curriculum & Content
  async getSubjects(): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>('/subjects');
    return response.data;
  },

  async getSubjectById(subjectId: string): Promise<Subject> {
    const response = await apiClient.get<Subject>(`/subjects/${subjectId}`);
    return response.data;
  },

  async getTopics(subjectId?: string): Promise<Topic[]> {
    const url = subjectId ? `/topics?subject_id=${subjectId}` : '/topics';
    const response = await apiClient.get<Topic[]>(url);
    return response.data;
  },

  async getTopicById(topicId: string): Promise<Topic> {
    const response = await apiClient.get<Topic>(`/topics/${topicId}`);
    return response.data;
  },

  async getContent(params?: {
    subject_id?: string;
    topic_id?: string;
    skill_id?: string;
    difficulty?: ContentDifficulty;
    content_type?: ContentType;
  }): Promise<LearningContentSummary[]> {
    const searchParams = new URLSearchParams();
    if (params?.subject_id) searchParams.append('subject_id', params.subject_id);
    if (params?.topic_id) searchParams.append('topic_id', params.topic_id);
    if (params?.skill_id) searchParams.append('skill_id', params.skill_id);
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.content_type) searchParams.append('content_type', params.content_type);

    const qs = searchParams.toString();
    const url = qs ? `/content?${qs}` : '/content';
    const response = await apiClient.get<LearningContentSummary[]>(url);
    return response.data;
  },

  async getContentById(contentId: string): Promise<LearningContentDetail> {
    const response = await apiClient.get<LearningContentDetail>(`/content/${contentId}`);
    return response.data;
  },
};
