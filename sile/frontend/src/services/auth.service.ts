import { apiClient } from './api.client';
import { AuthResponse, LoginPayload, RegisterPayload, UserSession } from '../types/auth.types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', payload);
    return res.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', payload);
    return res.data;
  },

  async getCurrentUser(): Promise<UserSession> {
    const res = await apiClient.get<UserSession>('/auth/me');
    return res.data;
  },

  logout(): void {
    localStorage.removeItem('sile_access_token');
    localStorage.removeItem('sile_refresh_token');
    localStorage.removeItem('sile_user');
  }
};
