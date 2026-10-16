/** ابزارهای فارسی‌سازی اعداد و متن. */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به فارسی */
export const toPersianDigits = (value: string | number): string =>
  String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]!);

export const toEnglishDigits = (value: string): string =>
  value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** عدد با جداکنندهٔ هزارگان + ارقام فارسی و ممیز فارسی */
export const formatNumber = (value: number): string =>
  toPersianDigits(value.toLocaleString('en-US')).replace(/\./g, '٫');

/** ساعت بدون پسوند، مثلاً «۱۴:۰۳» */
export const formatClockTime = (date: Date, use24Hour = true): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  if (use24Hour) return toPersianDigits(`${pad2(h)}:${pad2(m)}`);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return toPersianDigits(`${h12}:${pad2(m)}`);
};

/** ساعت به شکل «۱۴:۰۳» یا «۲:۰۳ ب.ظ» */
export const formatClock = (date: Date, use24Hour = true): string => {
  const time = formatClockTime(date, use24Hour);
  if (use24Hour) return time;
  return `${time} ${date.getHours() < 12 ? 'ق.ظ' : 'ب.ظ'}`;
};

export const formatClockWithSeconds = (date: Date, use24Hour = true): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  if (use24Hour) return toPersianDigits(`${pad2(h)}:${pad2(m)}:${pad2(s)}`);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return toPersianDigits(`${h12}:${pad2(m)}:${pad2(s)}`) + ` ${h < 12 ? 'ق.ظ' : 'ب.ظ'}`;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** حجم فایل خوانا */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return toPersianDigits(`${bytes} بایت`);
  if (bytes < 1024 * 1024) {
    return toPersianDigits((bytes / 1024).toFixed(1)).replace(/\./g, '٫') + ' کیلوبایت';
  }
  return toPersianDigits((bytes / 1024 / 1024).toFixed(1)).replace(/\./g, '٫') + ' مگابایت';
};
