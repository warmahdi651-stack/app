#!/usr/bin/env node
/**
 * کپی خروجی وب اپ به assets پروژهٔ apktool و تبدیل مسیرهای مطلق به نسبی
 * تا برنامه از طریق file:///android_asset/index.html بارگذاری شود.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const distDir = path.join(repoRoot, 'apps', 'mobile', 'dist');
const assetsDir = path.join(repoRoot, 'tools', 'apk', 'android', 'assets');

if (!fs.existsSync(distDir)) {
  console.error('❌ خروجی وب پیدا نشد. ابتدا اجرا کنید: npx expo export --platform web');
  process.exit(1);
}

fs.rmSync(assetsDir, { recursive: true, force: true });
fs.mkdirSync(assetsDir, { recursive: true });

/** کپی بازگشتی یک پوشه */
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

copyDir(distDir, assetsDir);

/** جایگزینی مسیرهای مطلق با نسخهٔ نسبی */
function patchFile(file, replacements) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = 0;
  for (const [pattern, value] of replacements) {
    const next = text.split(pattern).join(value);
    if (next !== text) changed += 1;
    text = next;
  }
  if (changed > 0) {
    fs.writeFileSync(file, text);
    console.log(`  ✔ ${path.relative(repoRoot, file)} (${changed} جایگزینی)`);
  }
}

const html = path.join(assetsDir, 'index.html');
patchFile(html, [
  ['"/_expo/', '"./_expo/'],
  ['"/favicon.ico', '"./favicon.ico'],
]);

const bundleDir = path.join(assetsDir, '_expo', 'static', 'js', 'web');
if (fs.existsSync(bundleDir)) {
  for (const name of fs.readdirSync(bundleDir)) {
    if (!name.endsWith('.js')) continue;
    patchFile(path.join(bundleDir, name), [['"/assets/', '"./assets/']]);
  }
}

/**
 * WebView های قدیمی اندروید (نسخهٔ سیستمی Chromium پیش از ۸۰) عملگرهای `??` و `?.`
 * را نمی‌فهمند و کل بسته با SyntaxError متوقف می‌شود. بسته را به هدف قدیمی‌تر ترجمه می‌کنیم.
 */
const require = createRequire(path.join(repoRoot, 'apps', 'mobile', 'package.json'));
const esbuild = require('esbuild');
if (fs.existsSync(bundleDir)) {
  for (const name of fs.readdirSync(bundleDir)) {
    if (!name.endsWith('.js')) continue;
    const file = path.join(bundleDir, name);
    const out = esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
      target: ['chrome55', 'es2016'],
      legalComments: 'none',
    });
    fs.writeFileSync(file, out.code);
    console.log(`  ✔ ${path.relative(repoRoot, file)} (ترجمه برای WebView قدیمی)`);
  }
}

/**
 * نگهبان بارگذاری: اگر بسته اجرا نشود یا صفحه بعد از ۱۵ ثانیه خالی بماند،
 * به‌جای صفحهٔ سفید، پیام خطا با دکمهٔ «Reload» نمایش داده می‌شود.
 */
const WATCHDOG = `<script>(function(){
var shown=false;
function fail(){
  if(shown)return;shown=true;
  var r=document.getElementById('root')||document.body;
  r.innerHTML='<div style="font:16px sans-serif;background:#0b1120;color:#fff;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box"><h2 style="margin:0 0 8px">Windows in Mobile</h2><p style="margin:0 0 20px">Something went wrong while loading this screen.</p><button onclick="location.reload()" style="padding:12px 22px;border:0;border-radius:8px;background:#1687e8;color:#fff;font-size:16px">Reload</button></div>';
}
function isEmpty(){var r=document.getElementById('root');return !r||!r.children.length;}
window.addEventListener('error',function(){setTimeout(function(){if(isEmpty())fail();},0);});
window.addEventListener('unhandledrejection',function(){setTimeout(function(){if(isEmpty())fail();},0);});
setTimeout(function(){if(isEmpty())fail();},15000);
})();</script>`;
patchFile(html, [['</head>', WATCHDOG + '</head>']]);

const total = fs
  .readdirSync(assetsDir, { recursive: true })
  .filter((f) => typeof f === 'string' && fs.statSync(path.join(assetsDir, f)).isFile()).length;
console.log(`✅ ${total} فایل در assets قرار گرفت.`);
