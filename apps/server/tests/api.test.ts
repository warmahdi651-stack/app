import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

/**
 * تست‌های API روی یک پایگاه‌دادهٔ موقت (PGlite) اجرا می‌شوند.
 */
let app: Awaited<ReturnType<typeof buildApp>>;
let dataDir: string;
let token = '';

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'wim-test-'));
  app = await buildApp({ dataDir, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
});

const auth = (extra: Record<string, unknown> = {}) => ({ authorization: `Bearer ${token}`, ...extra });

describe('سلامت سرویس', () => {
  it('پاسخ می‌دهد', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });
});

describe('احراز هویت', () => {
  it('ثبت‌نام کاربر تازه', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'karim', password: 'raz1234', displayName: 'کریم' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().token).toBeTruthy();
    token = res.json().token;
  });

  it('نام کاربری تکراری رد می‌شود', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'karim', password: 'raz1234' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('رمز اشتباه رد می‌شود', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'karim', password: 'wrong-pass' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('ورود موفق توکن می‌دهد', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'karim', password: 'raz1234' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.username).toBe('karim');
  });

  it('درخواست بدون توکن، ۴۰۱ می‌گیرد', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/fs/tree' });
    expect(res.statusCode).toBe(401);
  });
});

describe('سیستم فایل مجازی', () => {
  let folderId = '';
  let fileId = '';

  it('ساخت پوشه', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/fs/folders',
      headers: auth(),
      payload: { parentId: null, name: 'Documents' },
    });
    expect(res.statusCode).toBe(201);
    folderId = res.json().node.id;
  });

  it('ساخت فایل داخل پوشه', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/fs/files',
      headers: auth(),
      payload: { parentId: folderId, name: 'یادداشت.txt', content: 'سلام' },
    });
    expect(res.statusCode).toBe(201);
    fileId = res.json().node.id;
  });

  it('نام تکراری در یک مسیر مجاز نیست', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/fs/files',
      headers: auth(),
      payload: { parentId: folderId, name: 'یادداشت.txt' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('درخت فایل‌ها ساختار درستی دارد', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/fs/tree', headers: auth() });
    const tree = res.json().tree;
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Documents');
    expect(tree[0].children[0].name).toBe('یادداشت.txt');
    expect(tree[0].children[0].content).toBe('سلام');
  });

  it('ذخیرهٔ محتوای فایل', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/fs/nodes/${fileId}/content`,
      headers: auth(),
      payload: { content: 'متن تازه' },
    });
    expect(res.statusCode).toBe(200);
    const tree = await app.inject({ method: 'GET', url: '/api/fs/tree', headers: auth() });
    expect(tree.json().tree[0].children[0].content).toBe('متن تازه');
  });

  it('تغییر نام', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/fs/nodes/${fileId}`,
      headers: auth(),
      payload: { name: 'خوش‌آمدید.txt' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('حذف به سطل زباله و بازیابی', async () => {
    await app.inject({ method: 'DELETE', url: `/api/fs/nodes/${fileId}`, headers: auth() });
    const trash = await app.inject({ method: 'GET', url: '/api/fs/trash', headers: auth() });
    expect(trash.json().trash).toHaveLength(1);

    const tree = await app.inject({ method: 'GET', url: '/api/fs/tree', headers: auth() });
    expect(tree.json().tree[0].children).toHaveLength(0);

    await app.inject({ method: 'POST', url: `/api/fs/nodes/${fileId}/restore`, headers: auth() });
    const after = await app.inject({ method: 'GET', url: '/api/fs/tree', headers: auth() });
    expect(after.json().tree[0].children).toHaveLength(1);
  });

  it('حذف همیشگی', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/fs/nodes/${fileId}?permanent=true`,
      headers: auth(),
    });
    const trash = await app.inject({ method: 'GET', url: '/api/fs/trash', headers: auth() });
    expect(trash.json().trash).toHaveLength(0);
  });

  it('پوشه را نمی‌توان داخل خودش قرار داد', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/fs/nodes/${folderId}`,
      headers: auth(),
      payload: { parentId: folderId },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('یادداشت‌ها', () => {
  it('ساخت، ویرایش و حذف', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/notes',
      headers: auth(),
      payload: { title: 'کارهای امروز', body: '۱- تست' },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().note.id;

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/notes/${id}`,
      headers: auth(),
      payload: { title: 'کارهای فردا' },
    });
    expect(updated.json().note.title).toBe('کارهای فردا');
    expect(updated.json().note.body).toBe('۱- تست');

    const list = await app.inject({ method: 'GET', url: '/api/notes', headers: auth() });
    expect(list.json().notes).toHaveLength(1);

    await app.inject({ method: 'DELETE', url: `/api/notes/${id}`, headers: auth() });
    const empty = await app.inject({ method: 'GET', url: '/api/notes', headers: auth() });
    expect(empty.json().notes).toHaveLength(0);
  });
});

describe('وضعیت دسکتاپ', () => {
  it('ذخیره و بازیابی چیدمان پنجره‌ها', async () => {
    const state = JSON.stringify({ settings: { theme: 'dark' }, windows: [{ id: 'w1' }] });
    const saved = await app.inject({
      method: 'PUT',
      url: '/api/desktop',
      headers: auth(),
      payload: { state },
    });
    expect(saved.statusCode).toBe(200);

    const loaded = await app.inject({ method: 'GET', url: '/api/desktop', headers: auth() });
    expect(JSON.parse(loaded.json().state).windows).toHaveLength(1);
  });
});
