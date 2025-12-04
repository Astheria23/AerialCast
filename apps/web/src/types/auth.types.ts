import { UUID, ISODateTimeString } from './common';
import { UserRole } from './enums';

export interface User {
  user_id: UUID;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: ISODateTimeString;
}

export interface AuthResponse {
  message?: string;
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
  role?: UserRole;
}
