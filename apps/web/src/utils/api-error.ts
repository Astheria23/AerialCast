import { AxiosError } from 'axios';

export interface ApiErrorShape {
  status?: number;
  message: string;
  details?: Record<string, unknown> | null;
}

export const parseApiError = (error: unknown): ApiErrorShape => {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message =
      (error.response?.data as { error?: string; message?: string })?.error ||
      error.response?.statusText ||
      error.message ||
      'Unexpected API error';

    const details =
      (error.response?.data as { details?: Record<string, unknown> })?.details || null;

    return { status, message, details };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown error' };
};
