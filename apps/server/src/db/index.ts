/**
 * لایهٔ دسترسی به دیتابیس.
 *
 * دو حالت پشتیبانی می‌شود:
 *  1) اگر `DATABASE_URL` تنظیم شده باشد → اتصال به یک PostgreSQL واقعی با pg.
 *  2) در غیر این صورت → PGlite (خودِ PostgreSQL کامپایل‌شده به WASM) که روی دیسک ذخیره می‌شود.
 *
 * هر دو مسیر دقیقاً یک واسط یکسان ارائه می‌دهند، پس کد بالاتر (routes) متوجه تفاوت نمی‌شود.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export type QueryResult<T> = { rows: T[]; rowCount: number };

export interface Db {
  /** نام درایور برای نمایش در health check */
  readonly kind: 'postgres' | 'pglite';
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

class PostgresDb implements Db {
  readonly kind = 'postgres' as const;
  constructor(private readonly pool: pg.Pool) {}

  async query<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.pool.query(sql, params as unknown[]);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PgliteDb implements Db {
  readonly kind = 'pglite' as const;
  constructor(private readonly db: PGlite) {}

  async query<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.db.query<T>(sql, params as unknown[]);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

export async function createDb(options: { databaseUrl?: string; dataDir?: string }): Promise<Db> {
  if (options.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: options.databaseUrl,
      max: 10,
      ssl: options.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });
    // اتصال اولیه برای fail-fast
    const client = await pool.connect();
    client.release();
    return new PostgresDb(pool);
  }

  const dataDir = options.dataDir ?? path.resolve(process.cwd(), '.data/pgdata');
  await mkdir(path.dirname(dataDir), { recursive: true });
  const db = new PGlite({ dataDir });
  await db.waitReady;
  return new PgliteDb(db);
}
