import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPalette, type Palette } from '../theme';
import { useAuth } from './AuthProvider';
import { getDesktopState, patchDesktopState } from './desktopSync';
import type { ShellSettings } from './types';

export const defaultSettings: ShellSettings = {
  theme: 'dark',
  wallpaper: 'bloom',
  userName: 'کاربر',
  use24Hour: true,
  showSeconds: false,
  animations: true,
  taskbarPosition: 'bottom',
  accentColor: '#4c9aff',
};

type ShellContextValue = {
  settings: ShellSettings;
  palette: Palette;
  updateSettings: (patch: Partial<ShellSettings>) => void;
  resetSettings: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShellSettings>(() => ({
    ...defaultSettings,
    ...(getDesktopState().settings ?? {}),
  }));

  // پس از ورود کاربر، تنظیمات ذخیره‌شده روی سرور بازیابی می‌شود
  const { status: authStatus } = useAuth();
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const remote = getDesktopState().settings;
    if (remote) setSettings((prev) => ({ ...prev, ...remote }));
  }, [authStatus]);

  const updateSettings = useCallback((patch: Partial<ShellSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      patchDesktopState({ settings: next });
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    patchDesktopState({ settings: defaultSettings });
  }, []);

  const palette = useMemo(() => {
    const base = getPalette(settings.theme);
    if (settings.accentColor && settings.accentColor !== base.accent) {
      return { ...base, accent: settings.accentColor, accentHover: settings.accentColor };
    }
    return base;
  }, [settings.theme, settings.accentColor]);

  const value = useMemo<ShellContextValue>(
    () => ({ settings, palette, updateSettings, resetSettings }),
    [settings, palette, updateSettings, resetSettings],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell باید داخل ShellProvider استفاده شود.');
  return ctx;
}
