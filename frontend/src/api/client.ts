import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  return config;
});

type ApiErrorData = { error: { code: string; message: string; details?: unknown } };

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorData>) => {
    const data = error.response?.data;
    if (data?.error) {
      const apiError = new Error(data.error.message) as Error & {
        code: string;
        details: unknown;
        status: number;
      };
      apiError.code = data.error.code;
      apiError.details = data.error.details;
      apiError.status = error.response?.status ?? 0;
      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  },
);

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}
