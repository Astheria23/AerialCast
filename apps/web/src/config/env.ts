const stripTrailingSlash = (value?: string) => {
  if (!value) return undefined;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const isBrowser = typeof window !== 'undefined';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000';

export const API_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL
);

export const SOCKET_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE_URL
);

export const ENV = {
  API_BASE_URL,
  SOCKET_BASE_URL,
  IS_BROWSER: isBrowser,
};

export type EnvConfig = typeof ENV;
