import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const stateSchema = z.object({ state: z.string().max(2_000_000) });

/** وضعیت دسکتاپ (چیدمان پنجره‌ها، تم، پس‌زمینه و ...) به صورت JSON متنی ذخیره می‌شود. */
export async function desktopRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/desktop', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const result = await app.db.query<{ state: string; updated_at: Date }>(
      'SELECT state, updated_at FROM desktop_states WHERE user_id = $1',
      [user.id],
    );
    const row = result.rows[0];
    reply.send({
      state: row?.state ?? '{}',
      updatedAt: row?.updated_at?.toISOString?.() ?? null,
    });
  });

  app.put('/api/desktop', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const body = stateSchema.parse(request.body ?? {});
    await app.db.query(
      `INSERT INTO desktop_states (user_id, state, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
      [user.id, body.state],
    );
    reply.send({ ok: true });
  });
}
