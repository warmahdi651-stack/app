#!/usr/bin/env node
/**
 * بازسازی نهایی APK:
 *  - resources.arsc و AndroidManifest.xml بدون فشرده‌سازی ذخیره می‌شوند
 *    (الزام اندروید ۱۱+ برای نصب اپ‌هایی با targetSdk ۳۰ به بالا)
 *  - دادهٔ فایل‌های ذخیره‌شده روی مرز ۴ بایت هم‌تراز می‌شود (zipalign)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: repack.mjs <input.apk> <output.apk>');
  process.exit(1);
}

const STORED = new Set(['resources.arsc', 'AndroidManifest.xml']);
const ALIGNMENT = 4;

const zipEntries = [];
const buf = fs.readFileSync(input);
const bufLen = buf.length;

// خواندن سادهٔ ورودی‌های zip (فقط از فیلدهای لازم استفاده می‌کنیم)
function readEntries() {
  const eocdIndex = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdIndex < 0) throw new Error('EOCD not found');
  const count = buf.readUInt16LE(eocdIndex + 10);
  let offset = buf.readUInt32LE(eocdIndex + 16);
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('bad central dir');
    const method = buf.readUInt16LE(offset + 10);
    const crc = buf.readUInt32LE(offset + 16);
    const compSize = buf.readUInt32LE(offset + 20);
    const rawSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');

    const lhNameLen = buf.readUInt16LE(localOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);

    zipEntries.push({ name, method, crc, rawSize, data, compSize });
    offset += 46 + nameLen + extraLen + commentLen;
  }
}
readEntries();

const out = fs.openSync(output, 'w');
let position = 0;
const localParts = [];
const centralParts = [];

function write(chunk) {
  fs.writeSync(out, chunk);
  position += chunk.length;
}

for (const entry of zipEntries) {
  const nameBuf = Buffer.from(entry.name, 'utf8');
  const stored = STORED.has(entry.name);
  let method = entry.method;
  let payload = entry.data;
  if (stored && method !== 0) {
    payload = zlib.inflateRawSync(entry.data);
    method = 0;
  }
  const crc = entry.crc >>> 0;

  // هم‌ترازسازی داده روی مرز ۴ بایت
  const headerLen = 30 + nameBuf.length;
  const pad = (ALIGNMENT - ((position + headerLen) % ALIGNMENT)) % ALIGNMENT;
  const extraBuf = pad > 0 ? Buffer.alloc(pad) : Buffer.alloc(0);

  const localOffset = position;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10); // mod time
  local.writeUInt16LE(0x21, 12); // mod date (1996-01-01)
  local.writeUInt32LE(crc >>> 0, 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(entry.rawSize, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(extraBuf.length, 28);
  write(Buffer.concat([local, nameBuf, extraBuf, payload]));

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc >>> 0, 16);
  central.writeUInt32LE(payload.length, 20);
  central.writeUInt32LE(entry.rawSize, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(extraBuf.length, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(localOffset, 42);
  centralParts.push(Buffer.concat([central, nameBuf, extraBuf]));
}

const centralBuf = Buffer.concat(centralParts);
const centralOffset = position;
write(centralBuf);

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(centralParts.length, 8);
eocd.writeUInt16LE(centralParts.length, 10);
eocd.writeUInt32LE(centralBuf.length, 12);
eocd.writeUInt32LE(centralOffset, 16);
eocd.writeUInt16LE(0, 20);
write(eocd);

fs.closeSync(out);
console.log(
  `✅ بازسازی شد: ${path.basename(output)} (${zipEntries.length} ورودی، ` +
    `${[...STORED].filter((n) => zipEntries.some((e) => e.name === n)).join('، ')} بدون فشرده‌سازی)`,
);
