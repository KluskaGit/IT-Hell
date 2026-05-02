export interface UserProfileResponse {
  raw_cv: string | null;
  exp_level_id: number | null;
  technology_ids: number[];
}

export interface UserProfileUpdate {
  raw_cv?: string;
  exp_level_id?: number | null;
  technology_ids?: number[];
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