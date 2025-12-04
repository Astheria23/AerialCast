'use client';

import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, unknown, TVariables>
): UseMutationResult<TData, unknown, TVariables> {
  return useMutation({
    mutationFn,
    ...options,
  });
}
