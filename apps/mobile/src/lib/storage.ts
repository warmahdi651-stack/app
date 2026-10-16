import AsyncStorage from '@react-native-async-storage/async-storage';

/** شناسهٔ یکتا */
export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** خواندن مقدار از حافظهٔ محلی با مدیریت خطا */
export const readStorage = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** نوشتن در حافظهٔ محلی */
export const writeStorage = async (key: string, value: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // حافظه در دسترس نیست — بی‌صدا رد می‌شویم
  }
};

export const removeStorage = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // بی‌صدا
  }
};
