import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createSessionToken, hashPassword, verifyPassword } from '../lib/auth.js';
import { badRequest, bearerToken, conflict, HttpError, unauthorized } from '../lib/http.js';

const credentials = z.object({
  username: z.string().trim().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.').max(32),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ نویسه باشد.').max(128),
  displayName: z.string().trim().max(64).optional(),
});

const registerSchema = credentials.extend({
  displayName: z.string().trim().min(1).max(64).optional(),
});

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
};

const SESSION_DAYS = 30;

function publicUser(row: UserRow) {
  return { id: row.id, username: row.username, displayName: row.display_name };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body ?? {});
    const existing = await app.db.query<UserRow>('SELECT * FROM users WHERE username = $1', [body.username]);
    if (existing.rows.length > 0) throw conflict('این نام کاربری قبلاً ثبت شده است.');

    const { hash, salt } = await hashPassword(body.password);
    const id = crypto.randomUUID();
    await app.db.query(
      `INSERT INTO users (id, username, display_name, password_hash, password_salt)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, body.username, body.displayName ?? body.username, hash, salt],
    );

    const token = await issueSession(app, id);
    reply.status(201).send({ token, user: { id, username: body.username, displayName: body.displayName ?? body.username } });
  });

  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = credentials.pick({ username: true, password: true }).parse(request.body ?? {});
    const result = await app.db.query<UserRow>('SELECT * FROM users WHERE username = $1', [body.username]);
    const user = result.rows[0];
    if (!user) throw unauthorized('نام کاربری یا رمز عبور نادرست است.');

    const ok = await verifyPassword(body.password, user.password_hash, user.password_salt);
    if (!ok) throw unauthorized('نام کاربری یا رمز عبور نادرست است.');

    const token = await issueSession(app, user.id);
    reply.send({ token, user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = bearerToken(request);
    if (token) await app.db.query('DELETE FROM sessions WHERE token = $1', [token]);
    reply.send({ ok: true });
  });

  app.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    reply.send({ user: publicUser(user) });
  });
}

async function issueSession(app: FastifyInstance, userId: string): Promise<string> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await app.db.query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    userId,
    expiresAt.toISOString(),
  ]);
  return token;
}

export { HttpError, badRequest };
