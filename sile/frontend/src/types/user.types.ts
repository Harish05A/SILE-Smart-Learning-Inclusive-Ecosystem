import { UserSession } from './auth.types';

export type BaselineStatus = 'not_started' | 'in_progress' | 'completed';

export interface LearnerProfile {
  id: string;
  user_id: string;
  bio?: string;
  date_of_birth?: string;
  education_level?: string;
  target_learning_goal?: string;
  baseline_status: BaselineStatus;
  created_at: string;
  updated_at: string;
}

export interface UserFullProfile {
  user: UserSession;
  profile: LearnerProfile;
}
