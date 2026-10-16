import { describe, expect, it } from 'vitest';
import { formatBytes, formatClock, toEnglishDigits, toPersianDigits } from '../fa';

describe('ابزارهای فارسی‌سازی', () => {
  it('ارقام لاتین را به فارسی تبدیل می‌کند', () => {
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
    expect(toPersianDigits('12:34')).toBe('۱۲:۳۴');
  });

  it('ارقام فارسی را به لاتین برمی‌گرداند', () => {
    expect(toEnglishDigits('۱۴۰۵/۰۶/۲۵')).toBe('1405/06/25');
  });

  it('ساعت ۲۴ ساعته را درست نشان می‌دهد', () => {
    const date = new Date(2026, 9, 16, 14, 5);
    expect(formatClock(date, true)).toBe('۱۴:۰۵');
  });

  it('ساعت ۱۲ ساعته را با پسوند نشان می‌دهد', () => {
    const date = new Date(2026, 9, 16, 14, 5);
    expect(formatClock(date, false)).toBe('۲:۰۵ ب.ظ');
  });

  it('حجم فایل را خوانا می‌کند', () => {
    expect(formatBytes(512)).toBe('۵۱۲ بایت');
    expect(formatBytes(2048)).toBe('۲٫۰ کیلوبایت');
  });
});
