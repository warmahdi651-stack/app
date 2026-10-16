/**
 * تست دود (smoke test) روی نسخهٔ وب ساخته‌شده.
 *
 * این تست یک مرورگر واقعی لازم ندارد و با jsdom اجرا می‌شود:
 *  ۱) سرور API را روی یک پورت آزاد بالا می‌آورد (همان سروری که نسخهٔ وب را سرو می‌کند)
 *  ۲) صفحه را بارگذاری می‌کند و چند سناریوی واقعی را شبیه‌سازی می‌کند:
 *     باز شدن منوی استارت، باز کردن مدیر فایل، پیمایش پوشه‌ها و باز شدن فایل در Notepad
 *
 * پیش‌نیاز: `npm run build:web` در apps/mobile
 * اجرا:      `npm run test:e2e` در apps/mobile
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const serverRoot = path.resolve(mobileRoot, '../server');
const distIndex = path.join(mobileRoot, 'dist/index.html');
const PORT = 4187;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const results = [];
const check = (name, passed, extra = '') => {
  results.push({ name, passed });
  console.log(`${passed ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};

if (!existsSync(distIndex)) {
  console.error('نسخهٔ وب ساخته نشده است. ابتدا `npm run build:web` را اجرا کنید.');
  process.exit(1);
}

console.log('در حال بالا آوردن سرور…');
const server = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: serverRoot,
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'test',
    // پایگاه‌دادهٔ موقت تا داده‌های توسعه دست‌نخورده بماند
    PGLITE_DATA_DIR: mkdtempSync(path.join(tmpdir(), 'wim-e2e-')),
  },
  stdio: 'ignore',
});

const cleanup = () => {
  if (!server.killed) server.kill('SIGTERM');
};
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

async function waitForServer(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      // هنوز بالا نیامده
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push(String(e.message ?? e)));
virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));

const serverReady = await waitForServer();
check('سرور بالا آمد', serverReady);
if (!serverReady) {
  cleanup();
  process.exit(1);
}

const dom = await JSDOM.fromURL(`${BASE_URL}/`, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    // jsdom پیاده‌سازی کاملی از API فونت مرورگر ندارد
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    });
    window.scrollTo = () => {};
    window.CSSFontFaceRule = class CSSFontFaceRule {};
    window.document.fonts = {
      add() {},
      delete() {},
      forEach() {},
      ready: Promise.resolve(),
      check() {
        return true;
      },
    };
  },
});

const { window } = dom;
const doc = window.document;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bodyText = () => doc.body.textContent ?? '';
const buttons = () => [...doc.querySelectorAll('[tabindex="0"]')];
const byText = (needle) => buttons().find((el) => (el.textContent ?? '').includes(needle));
const click = (el) => {
  if (!el) return false;
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  return true;
};

try {
  await wait(4000);

  check('دسکتاپ رندر شد', bodyText().includes('این رایانه') && bodyText().includes('Terminal'));

  // کاراکتر آیکون دکمهٔ استارت را در همان ابتدا ذخیره می‌کنیم تا بعداً قابل شناسایی باشد
  const startGlyph = (buttons().find((el) => (el.textContent ?? '').trim().length === 1)?.textContent ?? '').trim();
  const startButton = () => buttons().find((el) => (el.textContent ?? '').trim() === startGlyph);
  check('ویجت ساعت و تاریخ شمسی', /[۰-۹]{2}:[۰-۹]{2}/.test(bodyText()) && bodyText().includes('مهر'));

  // دکمهٔ استارت: اولین دکمهٔ تک‌نویسه‌ای (آیکون) در نوار وظیفه
  const glyphButtons = buttons().filter((el) => (el.textContent ?? '').trim().length === 1);
  click(glyphButtons[0]);
  await wait(900);
  check(
    'منوی استارت باز شد',
    bodyText().includes('پیوست‌شده‌ها') && bodyText().includes('برنامه‌های سیستم'),
  );

  // باز کردن ماشین‌حساب از منوی استارت
  click(byText('ماشین‌حساب'));
  await wait(1200);
  check('ماشین‌حساب از منوی استارت باز شد', bodyText().includes('CE') && bodyText().includes('√x'));

  click(byText('این رایانه'));
  await wait(1200);
  check('پنجرهٔ مدیر فایل باز شد', bodyText().includes('مدیر فایل'));
  check('نوار آدرس دیسک C نمایش داده شد', bodyText().includes('C:'));
  check('پوشه‌های پیش‌فرض دیده می‌شوند', bodyText().includes('Users') && bodyText().includes('Program Files'));

  click(byText('Users'));
  await wait(700);
  check('پیمایش به پوشهٔ کاربر', bodyText().includes('Karim'));

  click(byText('Karim'));
  await wait(700);
  check('ورود به پوشهٔ کاربر', bodyText().includes('Documents') && bodyText().includes('Pictures'));

  click(byText('Documents'));
  await wait(700);
  check('پوشهٔ اسناد باز شد', bodyText().includes('خوش‌آمدید'));

  click(byText('خوش‌آمدید'));
  await wait(1500);
  check('فایل متنی در Notepad باز شد', bodyText().includes('به شبیه‌ساز ویندوز خوش آمدید'));
  check('نوار وضعیت Notepad', bodyText().includes('نویسه') && bodyText().includes('سطر'));

  // ── ترمینال: تایپ دستور و اجرای آن ──────────────────────────────
  click(startButton());
  await wait(800);
  click(byText('Terminal'));
  await wait(1200);
  check('ترمینال باز شد', bodyText().includes('Windows Terminal'));

  const typeInto = async (value) => {
    // آخرین ورودی صفحه متعلق به ترمینال است (پنجرهٔ آخر بازشده)
    const inputs = [...doc.querySelectorAll('input, textarea')];
    const input = inputs[inputs.length - 1];
    if (!input) return false;
    const proto =
      input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wait(200);
    input.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
    );
    await wait(900);
    return true;
  };

  await typeInto('help');
  check('دستور help اجرا شد', bodyText().includes('دستورهای موجود'));
  await typeInto('dir');
  check('دستور dir فهرست فایل‌ها را نشان داد', bodyText().includes('Directory of'));
  await typeInto('exit');
  check('دستور exit پنجره را بست', !bodyText().includes('دستورهای موجود'));

  check('بدون خطای اجرا', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  dom.window.close();
  cleanup();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} تست با موفقیت انجام شد.`);
process.exit(failed.length === 0 ? 0 : 1);
