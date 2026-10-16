import { api } from '../api/client';
import { readStorage, writeStorage } from '../lib/storage';
import type { ShellSettings, WindowInstance } from './types';

const STORAGE_KEY = 'wim.desktop.v1';

export type DesktopState = {
  settings?: ShellSettings;
  windows?: WindowInstance[];
};

let cache: DesktopState = {};
let ready = false;

/** بارگذاری وضعیت دسکتاپ از حافظهٔ محلی و (در صورت ورود) از سرور. */
export async function initDesktopState(token: string | null): Promise<DesktopState> {
  const local = await readStorage<DesktopState>(STORAGE_KEY, {});
  cache = { ...local };

  if (token) {
    try {
      const res = await api.get<{ state: string }>('/api/desktop');
      const remote = JSON.parse(res.state || '{}') as DesktopState;
      cache = { ...cache, ...remote };
    } catch {
      // سرور در دسترس نیست — با داده‌های محلی ادامه می‌دهیم
    }
  }

  await writeStorage(STORAGE_KEY, cache);
  ready = true;
  return cache;
}

export const getDesktopState = (): DesktopState => cache;
export const isDesktopStateReady = () => ready;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** به‌روزرسانی وضعیت دسکتاپ؛ نوشتن محلی و همگام‌سازی با سرور به‌صورت تأخیری. */
export function patchDesktopState(patch: DesktopState): void {
  cache = { ...cache, ...patch };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void writeStorage(STORAGE_KEY, cache);
    const token = api.getToken();
    if (token) {
      void api
        .put('/api/desktop', { state: JSON.stringify(cache) })
        .catch(() => undefined);
    }
  }, 400);
}

/** بازخوانی وضعیت از سرور پس از ورود/خروج. */
export async function refreshDesktopState(): Promise<DesktopState> {
  if (!api.getToken()) return cache;
  try {
    const res = await api.get<{ state: string }>('/api/desktop');
    const remote = JSON.parse(res.state || '{}') as DesktopState;
    cache = { ...cache, ...remote };
    await writeStorage(STORAGE_KEY, cache);
  } catch {
    // بی‌صدا
  }
  return cache;
}
