export type UserRole = 'admin' | 'pilot' | 'viewer';

export interface User {
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
}
