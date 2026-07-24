import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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


const BASE_URL = appConfig.apiUrl;

const customAxios: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const setAuthToken = (token: string | null): void => {
  if (token) {
    customAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete customAxios.defaults.headers.common['Authorization'];
  }
};

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];
let refreshTokenCallback: (() => Promise<Tokens>) | null = null;

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
  async (config) => {
    if (!config.headers.Authorization) {
      const token =
        (await AsyncStorage.getItem('access_token')) ||
        (await AsyncStorage.getItem('id_token'));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
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
        if (refreshTokenCallback) {
          const tokens: Tokens = await refreshTokenCallback();

          processQueue(null, tokens.accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          return customAxios(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

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

