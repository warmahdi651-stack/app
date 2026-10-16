import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { uid } from '../lib/storage';
import { useAuth } from './AuthProvider';
import { getDesktopState, patchDesktopState } from './desktopSync';
import type { WindowBounds, WindowInstance } from './types';

export type DesktopArea = { width: number; height: number };

type WindowAction =
  | { type: 'open'; payload: { id: string; appId: string; title: string; bounds: WindowBounds; props: Record<string, unknown>; singleton: boolean } }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'toggleMaximize'; id: string; area: DesktopArea }
  | { type: 'move'; id: string; x: number; y: number; area: DesktopArea }
  | { type: 'resize'; id: string; bounds: WindowBounds; area: DesktopArea }
  | { type: 'setTitle'; id: string; title: string }
  | { type: 'setProps'; id: string; props: Record<string, unknown> }
  | { type: 'restoreAll' }
  | { type: 'hydrate'; windows: WindowInstance[] };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const nextZ = (windows: WindowInstance[]) =>
  windows.reduce((max, w) => Math.max(max, w.zIndex), 0) + 1;

function reducer(state: WindowInstance[], action: WindowAction): WindowInstance[] {
  switch (action.type) {
    case 'hydrate':
      return action.windows;

    case 'open': {
      const { id, appId, title, bounds, props } = action.payload;
      const window: WindowInstance = {
        id,
        appId,
        title,
        bounds,
        props,
        zIndex: nextZ(state),
        minimized: false,
        maximized: false,
      };
      return [...state, window];
    }

    case 'close':
      return state.filter((w) => w.id !== action.id);

    case 'focus':
      return state.map((w) => (w.id === action.id ? { ...w, zIndex: nextZ(state) } : w));

    case 'minimize':
      return state.map((w) => (w.id === action.id ? { ...w, minimized: true } : w));

    case 'restore':
      return state.map((w) => (w.id === action.id ? { ...w, minimized: false } : w));

    case 'toggleMaximize': {
      const { id, area } = action;
      return state.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const restore = (w.props.restoreBounds as WindowBounds | undefined) ?? {
            x: 24,
            y: 24,
            width: Math.min(320, area.width - 24),
            height: Math.min(400, area.height - 24),
          };
          return { ...w, maximized: false, bounds: restore };
        }
        return {
          ...w,
          maximized: true,
          props: { ...w.props, restoreBounds: w.bounds },
          bounds: { x: 0, y: 0, width: area.width, height: area.height },
        };
      });
    }

    case 'move': {
      const { id, area } = action;
      return state.map((w) => {
        if (w.id !== id || w.maximized) return w;
        const x = clamp(action.x, -w.bounds.width + 64, area.width - 64);
        const y = clamp(action.y, 0, Math.max(0, area.height - 40));
        return { ...w, bounds: { ...w.bounds, x, y } };
      });
    }

    case 'resize': {
      const { id, area } = action;
      return state.map((w) => {
        if (w.id !== id || w.maximized) return w;
        const width = clamp(action.bounds.width, 200, area.width);
        const height = clamp(action.bounds.height, 140, area.height);
        const x = clamp(action.bounds.x, -width + 64, area.width - 64);
        const y = clamp(action.bounds.y, 0, Math.max(0, area.height - 40));
        return { ...w, bounds: { x, y, width, height } };
      });
    }

    case 'setTitle':
      return state.map((w) => (w.id === action.id ? { ...w, title: action.title } : w));

    case 'setProps':
      return state.map((w) => (w.id === action.id ? { ...w, props: { ...w.props, ...action.props } } : w));

    case 'restoreAll':
      return state.map((w) => ({ ...w, minimized: false }));

    default:
      return state;
  }
}

type WindowContextValue = {
  windows: WindowInstance[];
  openWindow: (options: {
    appId: string;
    title: string;
    bounds?: Partial<WindowBounds>;
    props?: Record<string, unknown>;
    singleton?: boolean;
  }) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, bounds: WindowBounds) => void;
  setWindowTitle: (id: string, title: string) => void;
  setWindowProps: (id: string, props: Record<string, unknown>) => void;
  restoreAll: () => void;
  desktopArea: DesktopArea;
  setDesktopArea: (area: DesktopArea) => void;
};

const WindowContext = createContext<WindowContextValue | null>(null);

export function WindowProvider({ children }: { children: React.ReactNode }) {
  const [windows, dispatch] = useReducer(reducer, []);
  const areaRef = useRef<DesktopArea>({ width: 390, height: 700 });
  const [, forceArea] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const saved = getDesktopState().windows;
    if (saved?.length) dispatch({ type: 'hydrate', windows: saved });
  }, []);

  // پس از ورود کاربر، چیدمان پنجره‌های ذخیره‌شده روی سرور بازیابی می‌شود
  const { status: authStatus } = useAuth();
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const saved = getDesktopState().windows;
    if (saved?.length) dispatch({ type: 'hydrate', windows: saved });
  }, [authStatus]);

  useEffect(() => {
    patchDesktopState({ windows });
  }, [windows]);

  const setDesktopArea = useCallback((area: DesktopArea) => {
    areaRef.current = area;
    forceArea();
  }, []);

  const openWindow = useCallback<WindowContextValue['openWindow']>(
    ({ appId, title, bounds, props = {}, singleton = false }) => {
      const area = areaRef.current;

      if (singleton) {
        const existing = windows.find((w) => w.appId === appId);
        if (existing) {
          dispatch({ type: 'focus', id: existing.id });
          dispatch({ type: 'restore', id: existing.id });
          dispatch({ type: 'setProps', id: existing.id, props });
          return existing.id;
        }
      }

      const width = bounds?.width ?? Math.min(320, Math.max(240, area.width - 40));
      const height = bounds?.height ?? Math.min(420, Math.max(220, area.height - 120));
      const offset = (windows.length % 5) * 18;
      const x = bounds?.x ?? clamp(Math.round((area.width - width) / 2) + offset, 4, Math.max(4, area.width - width));
      const y = bounds?.y ?? clamp(18 + offset, 4, Math.max(4, area.height - height));
      const id = uid('win');
      dispatch({
        type: 'open',
        payload: {
          id,
          appId,
          title,
          bounds: { x, y, width, height },
          props,
          singleton: false,
        },
      });
      return id;
    },
    [windows],
  );

  const value = useMemo<WindowContextValue>(
    () => ({
      windows,
      openWindow,
      closeWindow: (id) => dispatch({ type: 'close', id }),
      focusWindow: (id) => dispatch({ type: 'focus', id }),
      minimizeWindow: (id) => dispatch({ type: 'minimize', id }),
      toggleMaximize: (id) => dispatch({ type: 'toggleMaximize', id, area: areaRef.current }),
      moveWindow: (id, x, y) => dispatch({ type: 'move', id, x, y, area: areaRef.current }),
      resizeWindow: (id, bounds) => dispatch({ type: 'resize', id, bounds, area: areaRef.current }),
      setWindowTitle: (id, title) => dispatch({ type: 'setTitle', id, title }),
      setWindowProps: (id, props) => dispatch({ type: 'setProps', id, props }),
      restoreAll: () => dispatch({ type: 'restoreAll' }),
      desktopArea: areaRef.current,
      setDesktopArea,
    }),
    [windows, openWindow, setDesktopArea],
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}

export function useWindows(): WindowContextValue {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error('useWindows باید داخل WindowProvider استفاده شود.');
  return ctx;
}
