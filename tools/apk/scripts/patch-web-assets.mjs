#!/usr/bin/env node
/**
 * کپی خروجی وب اپ به assets پروژهٔ apktool و تبدیل مسیرهای مطلق به نسبی
 * تا برنامه از طریق file:///android_asset/index.html بارگذاری شود.
 */
import fs from 'node:fs';
import path from 'node:path';
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

const total = fs
  .readdirSync(assetsDir, { recursive: true })
  .filter((f) => typeof f === 'string' && fs.statSync(path.join(assetsDir, f)).isFile()).length;
console.log(`✅ ${total} فایل در assets قرار گرفت.`);
