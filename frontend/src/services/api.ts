import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const errorResponse = error.response?.data;
    const message = errorResponse?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
