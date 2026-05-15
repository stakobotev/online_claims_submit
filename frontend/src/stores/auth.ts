import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  bootstrapped: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  setBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  bootstrapped: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setBootstrapped: () => set({ bootstrapped: true }),
}));
