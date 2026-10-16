import { describe, expect, it } from 'vitest';
import { g2j, jalaliMonthLength, JALALI_MONTHS, toJalali } from '../jalali';

describe('تبدیل تاریخ میلادی به هجری شمسی', () => {
  it('۱۱ فوریهٔ ۱۹۷۹ برابر ۲۲ بهمن ۱۳۵۷ است', () => {
    expect(g2j(1979, 2, 11)).toEqual({ jy: 1357, jm: 11, jd: 22 });
  });

  it('۱ ژانویهٔ ۲۰۰۰ برابر ۱۱ دی ۱۳۷۸ است', () => {
    expect(g2j(2000, 1, 1)).toEqual({ jy: 1378, jm: 10, jd: 11 });
  });

  it('نوروز ۱۴۰۵ برابر ۲۱ مارس ۲۰۲۶ است', () => {
    expect(g2j(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 });
  });

  it('۱۶ اکتبر ۲۰۲۶ برابر ۲۴ مهر ۱۴۰۵ است', () => {
    expect(g2j(2026, 10, 16)).toEqual({ jy: 1405, jm: 7, jd: 24 });
  });

  it('نام ماه‌های فارسی را برمی‌گرداند', () => {
    expect(JALALI_MONTHS[0]).toBe('فروردین');
    expect(JALALI_MONTHS[11]).toBe('اسفند');
  });

  it('طول ماه‌های شمسی را درست محاسبه می‌کند', () => {
    expect(jalaliMonthLength(1405, 1)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
    expect(jalaliMonthLength(1403, 12)).toBe(30); // ۱۴۰۳ سال کبیسه است
    expect(jalaliMonthLength(1405, 12)).toBe(29);
  });

  it('از شیء Date میلادی هم پشتیبانی می‌کند', () => {
    expect(toJalali(new Date(2026, 9, 16))).toEqual({ jy: 1405, jm: 7, jd: 24 });
  });
});
