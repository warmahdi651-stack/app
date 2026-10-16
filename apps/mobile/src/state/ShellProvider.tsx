import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPalette, type Palette } from '../theme';
import { useAuth } from './AuthProvider';
import { getDesktopState, patchDesktopState } from './desktopSync';
import type { ShellSettings } from './types';

export const defaultSettings: ShellSettings = {
  shellVersion: undefined,
  theme: 'dark',
  wallpaper: 'bloom',
  userName: 'Guest',
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

  // پس از Sign in کاربر، Settings Save‌شده روی سرور بازیابی می‌شود
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
    const edition = settings.shellVersion ?? 'win11';
    const shell = edition === 'win7'
      ? { accent: '#1686c9', taskbar: 'rgba(18,45,74,0.92)', windowHeader: '#dcecf8', windowHeaderActive: '#f5fbff', menu: 'rgba(225,240,250,0.97)' }
      : edition === 'win8'
        ? { accent: '#00a6c7', taskbar: 'rgba(18,50,68,0.94)', windowHeader: '#e4f7fa', windowHeaderActive: '#f5feff', menu: 'rgba(235,249,251,0.98)' }
        : edition === 'win10'
          ? { accent: '#0878d1', taskbar: 'rgba(28,32,38,0.95)', windowHeader: '#f2f2f2', windowHeaderActive: '#ffffff', menu: 'rgba(247,247,247,0.98)' }
          : {};
    const merged = { ...base, ...shell };
    if (settings.accentColor && settings.accentColor !== base.accent) {
      return { ...merged, accent: settings.accentColor, accentHover: settings.accentColor };
    }
    return merged;
  }, [settings.theme, settings.accentColor, settings.shellVersion]);

  const value = useMemo<ShellContextValue>(
    () => ({ settings, palette, updateSettings, resetSettings }),
    [settings, palette, updateSettings, resetSettings],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside ShellProvider.');
  return ctx;
}
