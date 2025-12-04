'use client';

import { useMemo } from 'react';

import { useAuthContext } from '@/context/AuthContext';

export const useAuth = () => {
  const context = useAuthContext();

  const computedFlags = useMemo(
    () => ({
      isAdmin: context.user?.role === 'ADMIN',
      isPilot: context.user?.role === 'PILOT',
      loading: context.status === 'idle' || context.status === 'loading',
    }),
    [context.status, context.user?.role]
  );

  return {
    ...context,
    ...computedFlags,
  };
};
