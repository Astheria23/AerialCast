import { useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { User } from '@/types/auth.types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isPilot = user?.role === 'pilot';

  return {
    user,
    loading,
    isAdmin,
    isPilot,
  };
};
