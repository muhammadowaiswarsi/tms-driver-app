import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { appConfig } from '../utils/appConfig';

interface FailedQueueItem {
  resolve: (value: string) => void;
  reject: (error: any) => void;
}

interface Tokens {
  accessToken: string;
  refreshToken?: string;
  [key: string]: any;
}

// Get base URL from config
const BASE_URL = appConfig.apiUrl;

const customAxios: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set the Authorization header dynamically
export const setAuthToken = (token: string | null): void => {
  if (token) {
    customAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete customAxios.defaults.headers.common['Authorization'];
  }
};

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];
let refreshTokenCallback: (() => Promise<Tokens>) | null = null;

// Set the refresh token callback
export const setRefreshTokenCallback = (callback: () => Promise<Tokens>) => {
  refreshTokenCallback = callback;
};

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });

  failedQueue = [];
};

customAxios.interceptors.request.use(
  (config) => {
    // Authorization header is set via setAuthToken from context
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

customAxios.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return customAxios(originalRequest);
          })
          .catch((err: any) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh tokens - this will be handled by AuthService
        // We'll use a callback pattern to avoid circular dependencies
        // The refresh function should be set by the auth context
        if (refreshTokenCallback) {
          const tokens: Tokens = await refreshTokenCallback();

          // Update the failed queue
          processQueue(null, tokens.accessToken);

          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          return customAxios(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, logout user and redirect to login
        processQueue(refreshError, null);

        // Redirect to login page - this will be handled by navigation
        // For now, we'll just reject
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { customAxios };
export default customAxios;

