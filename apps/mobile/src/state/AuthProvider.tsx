import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { readStorage, writeStorage, removeStorage } from '../lib/storage';
import { refreshDesktopState } from './desktopSync';
import type { AuthState, AuthUser } from './types';

const STORAGE_KEY = 'wim.auth.v1';

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
    token: null,
    error: null,
    busy: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await readStorage<{ token: string; user: AuthUser } | null>(STORAGE_KEY, null);
      if (cancelled) return;
      if (!saved?.token) {
        setState({ status: 'guest', user: null, token: null, error: null, busy: false });
        return;
      }
      api.setToken(saved.token);
      try {
        const res = await api.get<{ user: AuthUser }>('/api/auth/me');
        if (cancelled) return;
        await refreshDesktopState();
        setState({ status: 'authenticated', user: res.user, token: saved.token, error: null, busy: false });
      } catch {
        api.setToken(null);
        await removeStorage(STORAGE_KEY);
        if (cancelled) return;
        setState({ status: 'guest', user: null, token: null, error: null, busy: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { username, password });
      api.setToken(res.token);
      await writeStorage(STORAGE_KEY, { token: res.token, user: res.user });
      await refreshDesktopState();
      setState({ status: 'authenticated', user: res.user, token: res.token, error: null, busy: false });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed.';
      setState((prev) => ({ ...prev, busy: false, error: message }));
      return false;
    }
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/api/auth/register', {
        username,
        password,
        displayName,
      });
      api.setToken(res.token);
      await writeStorage(STORAGE_KEY, { token: res.token, user: res.user });
      await refreshDesktopState();
      setState({ status: 'authenticated', user: res.user, token: res.token, error: null, busy: false });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed.';
      setState((prev) => ({ ...prev, busy: false, error: message }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // بی‌صدا
    }
    api.setToken(null);
    await removeStorage(STORAGE_KEY);
    setState({ status: 'guest', user: null, token: null, error: null, busy: false });
  }, []);

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, clearError }),
    [state, login, register, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
