export interface UserSession {
  id: string;
  email: string;
  role: 'learner' | 'educator' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  learner_profile?: {
    id: string;
    user_id: string;
    full_name: string;
    age?: number;
    grade?: string;
    preferred_language: string;
    learning_pace: string;
    preferred_content_type: string;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: UserSession;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}
