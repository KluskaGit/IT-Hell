import { LookupRead } from '../../features/public-job-board/models/lookup.model';

export interface UserProfileResponse {
  id: string;
  user_id: string;
  raw_cv: string | null;
  exp_level: LookupRead | null;
  technologies: LookupRead[];
}

export interface UserProfileUpdate {
  raw_cv?: string | null;
  exp_level_id?: string | null;
  technology_ids?: string[];
}

export interface UserRead {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string | null;
}