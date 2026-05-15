import { apiClient } from './client';
import type { User } from '../types';

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  passwordConfirmation: string;
  captchaToken: string;
  consents: {
    termsVersion: string;
    privacyVersion: string;
    marketing: boolean;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export async function register(payload: RegisterPayload): Promise<{ userId: string; status: string }> {
  const res = await apiClient.post<{ userId: string; status: string }>('/auth/register', payload);
  return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function refresh(): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/refresh');
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(email: string, captchaToken: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email, captchaToken });
}

export async function resetPassword(payload: {
  token: string;
  password: string;
  passwordConfirmation: string;
}): Promise<void> {
  await apiClient.post('/auth/reset-password', payload);
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email });
}

export async function exchangeOAuthCode(code: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/oauth/exchange', { code });
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<User>('/me');
  return res.data;
}
