import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
const databaseUrl = process.env.DATABASE_URL;
const dataDir = process.env.PGLITE_DATA_DIR;

const app = await buildApp({ databaseUrl, dataDir, logger: process.env.NODE_ENV !== 'test' });

try {
  await app.listen({ port, host });
  const driver = databaseUrl ? 'PostgreSQL (DATABASE_URL)' : 'PGlite (WASM)';
  app.log.info(`درایور پایگاه‌داده: ${driver}`);
  app.log.info(`سرور روی http://${host}:${port} در حال اجراست.`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
