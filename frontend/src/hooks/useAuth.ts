import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { setAuthToken } from '../api/client';
import * as authApi from '../api/auth';
import type { LoginPayload, RegisterPayload } from '../api/auth';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const isAuthenticated = user !== null && accessToken !== null;
  const role = user?.role ?? null;

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await authApi.login(payload);
      setAuth(data.user, data.accessToken);
      setAuthToken(data.accessToken);
    },
    [setAuth],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    return authApi.register(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    } finally {
      clearAuth();
      setAuthToken(null);
      navigate('/');
    }
  }, [clearAuth, navigate]);

  const attemptRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const data = await authApi.refresh();
      setAuth(data.user, data.accessToken);
      setAuthToken(data.accessToken);
      return true;
    } catch {
      clearAuth();
      setAuthToken(null);
      return false;
    }
  }, [setAuth, clearAuth]);

  return { user, accessToken, isAuthenticated, role, login, logout, register, attemptRefresh };
}
