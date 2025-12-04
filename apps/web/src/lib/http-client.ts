import axios from 'axios';

import { API_BASE_URL } from '@/config/env';
import { parseApiError } from '@/utils/api-error';
import { storage } from '@/utils/storage';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(parseApiError(error))
);

export default httpClient;
