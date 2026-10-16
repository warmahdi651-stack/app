import { toPersianDigits } from './fa';

/**
 * تقویم هجری شمسی (جلالی) و تبدیل آن با تاریخ میلادی.
 * الگوریتم: محاسبهٔ روز ژولیَن + الگوریتم تبدیل تقویم جلالی (سال کبیسه با چرخهٔ ۳۳ ساله).
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456,
  3178,
];

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

export type JalaliDate = { jy: number; jm: number; jd: number };

type JalCal = { leap: number; gy: number; march: number };

function jalCal(jy: number): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0]!;
  let jm = 0;
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    const jm1 = jm;
    jm = BREAKS[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/** تعداد روزهای ژولیَن (شمارهٔ روز) برای یک تاریخ میلادی — فرمول استاندارد Meeus */
function g2d(gy: number, gm: number, gd: number): number {
  const a = Math.trunc((gm - 14) / 12);
  return (
    Math.floor((1461 * (gy + 4800 + a)) / 4) +
    Math.floor((367 * (gm - 2 - 12 * a)) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + a) / 100)) / 4) +
    gd -
    32075
  );
}

/** تبدیل روز ژولیَن به تاریخ میلادی */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const gd = e - Math.floor((153 * m + 2) / 5) + 1;
  const gm = m + 3 - 12 * Math.floor(m / 10);
  const gy = 100 * b + d - 4800 + Math.floor(m / 10);
  return { gy, gm, gd };
}

function j2d(jy: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march);
}

/**
 * تبدیل روز ژولیَن به تاریخ جلالی.
 *
 * ابتدا سال جلالی متناظر پیدا می‌شود (بازهٔ بین ۱ فروردینِ آن سال تا ۱ فروردینِ سال بعد)
 * و سپس روز داخل سال محاسبه می‌شود؛ شش ماه اول همیشه ۳۱ روزه‌اند.
 */
export function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  let start = j2d(jy);

  if (jdn < start) {
    jy -= 1;
    start = j2d(jy);
  } else {
    const next = j2d(jy + 1);
    if (jdn >= next) {
      jy += 1;
      start = next;
    }
  }

  let k = jdn - start;
  if (k <= 185) {
    return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
  }
  k -= 186;
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** تبدیل تاریخ میلادی (ژولیَن) به جلالی */
export function g2j(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

export const toJalali = (date: Date): JalaliDate => g2j(date.getFullYear(), date.getMonth() + 1, date.getDate());

export const isJalaliLeap = (jy: number): boolean => jalCal(jy).leap === 0;

export const jalaliMonthLength = (jy: number, jm: number): number => {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
};

/** مثال: «۲۵ شهریور ۱۴۰۵» */
export const formatJalali = (date: Date): string => {
  const { jy, jm, jd } = toJalali(date);
  return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
};

/** مثال: «پنجشنبه ۲۵ شهریور ۱۴۰۵» */
export const formatJalaliLong = (date: Date): string => {
  const { jy, jm, jd } = toJalali(date);
  return toPersianDigits(`${WEEKDAYS[date.getDay()]} ${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
};

/** مثال: «۱۴۰۵/۰۶/۲۵» */
export const formatJalaliNumeric = (date: Date): string => {
  const { jy, jm, jd } = toJalali(date);
  return toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`);
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** تعداد روزهای ماه میلادی */
export const daysInGregorianMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
