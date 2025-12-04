'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { authService } from '@/services/auth.service';
import { LoginCredentials, RegisterCredentials, User } from '@/types/auth.types';
import { storage } from '@/utils/storage';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refreshFromStorage: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readAuthFromStorage = () => {
  const storedToken = storage.getToken();
  const storedUser = storage.getUser<User>();
  const status: AuthStatus = storedToken && storedUser ? 'authenticated' : 'unauthenticated';
  return { storedUser, storedToken, status };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { storedUser, storedToken, status: initialStatus } = readAuthFromStorage();
  const [user, setUser] = useState<User | null>(storedUser);
  const [token, setToken] = useState<string | null>(storedToken);
  const [status, setStatus] = useState<AuthStatus>(initialStatus);

  const bootstrapAuth = useCallback(() => {
    const { storedUser: nextUser, storedToken: nextToken, status: nextStatus } = readAuthFromStorage();
    setUser(nextUser);
    setToken(nextToken);
    setStatus(nextStatus);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setStatus('loading');
      try {
        const response = await authService.login(credentials);
        setUser(response.user);
        setToken(response.access_token);
        setStatus('authenticated');
      } catch (error) {
        setStatus('unauthenticated');
        throw error;
      }
    },
    []
  );

  const register = useCallback(async (payload: RegisterCredentials) => {
    await authService.register(payload);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
      refreshFromStorage: bootstrapAuth,
    }),
    [bootstrapAuth, login, logout, register, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
