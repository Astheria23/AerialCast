import { ENV } from '@/config/env';

export const STORAGE_KEYS = {
  TOKEN: 'aerialcast.token',
  USER: 'aerialcast.user',
};

const safeWindow = () => (ENV.IS_BROWSER ? window : undefined);

const getItem = (key: string) => {
  const w = safeWindow();
  if (!w) return null;
  return w.localStorage.getItem(key);
};

const setItem = (key: string, value: string) => {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(key, value);
};

const removeItem = (key: string) => {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(key);
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse storage payload', error);
    return null;
  }
};

export const storage = {
  getToken: () => getItem(STORAGE_KEYS.TOKEN),
  setToken: (token: string) => setItem(STORAGE_KEYS.TOKEN, token),
  clearToken: () => removeItem(STORAGE_KEYS.TOKEN),
  getUser: <T>() => parseJson<T>(getItem(STORAGE_KEYS.USER)),
  setUser: <T>(value: T) => setItem(STORAGE_KEYS.USER, JSON.stringify(value)),
  clearUser: () => removeItem(STORAGE_KEYS.USER),
  clearAuth: () => {
    removeItem(STORAGE_KEYS.TOKEN);
    removeItem(STORAGE_KEYS.USER);
  },
};
