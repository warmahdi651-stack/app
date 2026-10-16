import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { createDb } from './db/index.js';
import { SCHEMA_SQL } from './db/schema.js';
import { bearerToken, HttpError, unauthorized } from './lib/http.js';
import { authRoutes } from './routes/auth.js';
import { desktopRoutes } from './routes/desktop.js';
import { fsRoutes } from './routes/fs.js';
import { noteRoutes } from './routes/notes.js';
import type { SessionRow, UserRow } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, '../../mobile/dist');

export type BuildAppOptions = {
  databaseUrl?: string;
  dataDir?: string;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 8 * 1024 * 1024,
  });

  const db = await createDb({ databaseUrl: options.databaseUrl, dataDir: options.dataDir });
  app.decorate('db', db);
  await db.exec(SCHEMA_SQL);

  app.decorate('requireUser', async (request): Promise<UserRow> => {
    const token = bearerToken(request);
    if (!token) throw unauthorized();

    const session = await db.query<SessionRow>(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > now()',
      [token],
    );
    const row = session.rows[0];
    if (!row) throw unauthorized('نشست شما منقضی شده است. دوباره وارد شوید.');

    const user = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [row.user_id]);
    const current = user.rows[0];
    if (!current) throw unauthorized('کاربر یافت نشد.');
    return current;
  });

  await app.register(cors, { origin: true, credentials: true });

  app.get('/api/health', async () => ({
    ok: true,
    driver: db.kind,
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(fsRoutes);
  await app.register(noteRoutes);
  await app.register(desktopRoutes);

  const hasWebBuild = existsSync(path.join(webDist, 'index.html'));
  if (hasWebBuild) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/', index: ['index.html'] });
    app.log.info(`وب‌اپ نسخهٔ ساخته‌شده سرو می‌شود: ${webDist}`);
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) {
      reply.status(404).send({ error: { code: 'not_found', message: 'این مسیر وجود ندارد.' } });
      return;
    }
    if (hasWebBuild) {
      reply.type('text/html').sendFile('index.html');
      return;
    }
    reply.status(404).send({
      error: { code: 'not_found', message: 'نسخهٔ وب ساخته نشده است. با `npm run build:web` آن را بسازید.' },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      reply.status(400).send({
        error: { code: 'validation_error', message: first?.message ?? 'داده‌های ارسالی نامعتبر است.' },
      });
      return;
    }
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }
    if ((error as { statusCode?: number }).statusCode === 400) {
      reply.status(400).send({ error: { code: 'bad_request', message: (error as Error).message } });
      return;
    }
    request.log.error({ err: error }, 'unhandled error');
    reply.status(500).send({ error: { code: 'internal_error', message: 'خطای داخلی سرور.' } });
  });

  app.addHook('onClose', async () => {
    await db.close();
  });

  return app;
}

/** توکن نشست برای تست‌های واحد. */
export function createTestToken(): string {
  return randomBytes(16).toString('hex');
}
