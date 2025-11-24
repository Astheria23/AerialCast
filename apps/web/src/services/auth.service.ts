import api from '@/lib/axios';
import { LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

};
