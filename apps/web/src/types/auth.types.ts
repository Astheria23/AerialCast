export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'pilot' | 'viewer';
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
