import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import { storage } from '@/utils/storage';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types/auth.types';
import { UserRole } from '@/types/enums';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ROUTES.AUTH.LOGIN, credentials);
    if (response.data.access_token) {
      storage.setToken(response.data.access_token);
      storage.setUser(response.data.user);
    }
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ROUTES.AUTH.REGISTER, {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName,
      role: credentials.role,
    });
    return response.data;
  },

  logout: () => {
    storage.clearAuth();
    window.location.href = '/login';
  },

  getUser: (): User | null => {
    return storage.getUser<User>();
  },

  getUserRole: (): UserRole | null => {
    const user = authService.getUser();
    return user?.role || null;
  },
};
