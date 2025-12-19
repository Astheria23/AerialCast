import api from '@/lib/axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types/auth.types';

type RawUser = Partial<User> & { user_id?: string; userId?: string; role?: string };

const normalizeUser = (user: RawUser | null | undefined): User | null => {
  if (!user) return null;
  const normalizedRole = typeof user.role === 'string' ? (user.role.toLowerCase() as User['role']) : 'viewer';
  const id = user.id ?? user.user_id ?? user.userId;
  if (!id) {
    return null;
  }

  return {
    ...(user as object),
    id,
    user_id: user.user_id ?? id,
    role: normalizedRole,
  } as User;
};

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const normalizedUser = normalizeUser(response.data.user);

    if (response.data.access_token && normalizedUser) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }

    return {
      ...response.data,
      user: normalizedUser ?? response.data.user,
    };
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName,
    });
    const normalizedUser = normalizeUser(response.data.user);
    return { ...response.data, user: normalizedUser ?? response.data.user };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr) as RawUser;
          return normalizeUser(parsed);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  getUserRole: (): string | null => {
    const user = authService.getUser();
    return user?.role || null;
  },
};
