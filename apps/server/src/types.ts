import type { FastifyRequest } from 'fastify';
import type { Db } from './db/index.js';

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
};

export type SessionRow = {
  token: string;
  user_id: string;
  expires_at: Date;
};

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    /** کاربر جاری را بر اساس هدر Authorization برمی‌گرداند یا خطای ۴۰۱ می‌دهد. */
    requireUser(request: FastifyRequest): Promise<UserRow>;
  }
}

export type { Db };
