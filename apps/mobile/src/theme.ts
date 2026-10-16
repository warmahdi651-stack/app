/**
 * تم بصری — الهام‌گرفته از Windows 11 با پشتیبانی کامل راست‌به‌چپ.
 */

export type ThemeName = 'light' | 'dark';

export type Palette = {
  name: ThemeName;
  /** پس‌زمینهٔ اصلی دسکتاپ */
  desktop: string;
  window: string;
  windowBorder: string;
  windowHeader: string;
  windowHeaderActive: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  taskbar: string;
  taskbarBorder: string;
  menu: string;
  menuBorder: string;
  danger: string;
  success: string;
  warning: string;
  shadow: string;
  inputBg: string;
  selection: string;
};

export const lightPalette: Palette = {
  name: 'light',
  desktop: '#0f172a',
  window: '#f3f3f3',
  windowBorder: 'rgba(0,0,0,0.28)',
  windowHeader: '#ececec',
  windowHeaderActive: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f7f7f7',
  surfaceHover: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.10)',
  borderStrong: 'rgba(0,0,0,0.18)',
  text: '#1b1b1b',
  textMuted: '#5c5c5c',
  textOnAccent: '#ffffff',
  accent: '#0a6cff',
  accentHover: '#0a5ad4',
  accentSoft: 'rgba(10,108,255,0.12)',
  taskbar: 'rgba(243,243,243,0.92)',
  taskbarBorder: 'rgba(0,0,0,0.10)',
  menu: 'rgba(249,249,249,0.98)',
  menuBorder: 'rgba(0,0,0,0.12)',
  danger: '#c42b1c',
  success: '#107c41',
  warning: '#9d5d00',
  shadow: 'rgba(0,0,0,0.30)',
  inputBg: '#ffffff',
  selection: 'rgba(10,108,255,0.18)',
};

export const darkPalette: Palette = {
  name: 'dark',
  desktop: '#0b1120',
  window: '#202020',
  windowBorder: 'rgba(255,255,255,0.14)',
  windowHeader: '#2b2b2b',
  windowHeaderActive: '#333333',
  surface: '#272727',
  surfaceAlt: '#1f1f1f',
  surfaceHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.20)',
  text: '#f2f2f2',
  textMuted: '#a8a8a8',
  textOnAccent: '#ffffff',
  accent: '#4c9aff',
  accentHover: '#3b86ea',
  accentSoft: 'rgba(76,154,255,0.18)',
  taskbar: 'rgba(32,32,32,0.92)',
  taskbarBorder: 'rgba(255,255,255,0.10)',
  menu: 'rgba(43,43,43,0.98)',
  menuBorder: 'rgba(255,255,255,0.12)',
  danger: '#ff6b6b',
  success: '#4ade80',
  warning: '#fbbf24',
  shadow: 'rgba(0,0,0,0.55)',
  inputBg: '#1b1b1b',
  selection: 'rgba(76,154,255,0.28)',
};

export const getPalette = (theme: ThemeName): Palette => (theme === 'dark' ? darkPalette : lightPalette);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  bold: 'Vazirmatn_700Bold',
} as const;

export const typeScale = {
  caption: 10,
  small: 11,
  body: 13,
  title: 15,
  heading: 18,
  display: 24,
} as const;

/** رنگ‌های پس‌زمینهٔ دسکتاپ (گرادیان‌ها) */
export const wallpapers: { id: string; label: string; colors: [string, string, ...string[]] }[] = [
  { id: 'bloom', label: 'شکوفه', colors: ['#1e3c72', '#2a5298', '#7f7fd5'] },
  { id: 'sunset', label: 'غروب', colors: ['#3a1c71', '#d76d77', '#ffaf7b'] },
  { id: 'forest', label: 'جنگل', colors: ['#093028', '#237a57', '#5fbb8b'] },
  { id: 'graphite', label: 'گرافیت', colors: ['#0f2027', '#203a43', '#2c5364'] },
  { id: 'sakura', label: 'ساکورا', colors: ['#41295a', '#2f0743', '#c471ed'] },
  { id: 'ocean', label: 'اقیانوس', colors: ['#0b486b', '#f56217', '#f8b500'] },
];

export const getWallpaper = (id: string) => wallpapers.find((w) => w.id === id) ?? wallpapers[0]!;
