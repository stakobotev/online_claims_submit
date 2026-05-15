import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, null, children);
}

const MOCK_USER: User = {
  id: 'u-1',
  email: 'user@test.com',
  name: 'Test User',
  role: 'user',
  status: 'active',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  anonymizedAt: null,
};

vi.mock('../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
  setAuthToken: vi.fn(),
}));

vi.mock('../../api/auth', () => {
  const user = {
    id: 'u-1',
    email: 'user@test.com',
    name: 'Test User',
    role: 'user',
    status: 'active',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    anonymizedAt: null,
  };
  return {
    login: vi.fn().mockResolvedValue({ accessToken: 'mock-access-token', user }),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockRejectedValue(new Error('No refresh token')),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerification: vi.fn(),
    exchangeOAuthCode: vi.fn(),
    getMe: vi.fn(),
  };
});

describe('useAuth hook', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  it('login populates auth store with user and token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'user@test.com', password: 'Test1234!' });
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('user@test.com');
    expect(result.current.accessToken).toBe('mock-access-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears auth store', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'user@test.com', password: 'Test1234!' });
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('attemptRefresh returns false when no refresh token exists', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let success = true;
    await act(async () => {
      success = await result.current.attemptRefresh();
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refresh-on-mount populates store on successful refresh', async () => {
    const authApi = await import('../../api/auth');
    vi.mocked(authApi.refresh).mockResolvedValueOnce({
      accessToken: 'refreshed-token',
      user: { ...MOCK_USER, email: 'refreshed@test.com', name: 'Refreshed' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const ok = await result.current.attemptRefresh();
      expect(ok).toBe(true);
    });

    expect(result.current.user?.email).toBe('refreshed@test.com');
    expect(result.current.accessToken).toBe('refreshed-token');
  });

  it('role is exposed from user object', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'user@test.com', password: 'Test1234!' });
    });

    expect(result.current.role).toBe('user');
  });
});
