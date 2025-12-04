'use client';

import {
  QueryKey,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

export function useApiQuery<TData>(
  key: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, unknown, TData, QueryKey>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData> {
  return useQuery({
    queryKey: key,
    queryFn,
    ...options,
  });
}
