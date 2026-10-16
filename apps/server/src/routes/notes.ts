import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { notFound } from '../lib/http.js';

type NoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
};

const noteSchema = z.object({
  title: z.string().trim().min(1, 'عنوان الزامی است.').max(160),
  body: z.string().max(100_000).default(''),
  pinned: z.boolean().default(false),
});

/** برای ویرایش جزئی نباید مقدار پیش‌فرض اعمال شود (وگرنه متن یادداشت پاک می‌شود). */
const noteUpdateSchema = z.object({
  title: z.string().trim().min(1, 'عنوان الزامی است.').max(160).optional(),
  body: z.string().max(100_000).optional(),
  pinned: z.boolean().optional(),
});

const dto = (row: NoteRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  pinned: row.pinned,
  createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
  updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
});

export async function noteRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const result = await app.db.query<NoteRow>(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY pinned DESC, updated_at DESC',
      [user.id],
    );
    reply.send({ notes: result.rows.map(dto) });
  });

  app.post('/api/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const body = noteSchema.parse(request.body ?? {});
    const id = crypto.randomUUID();
    await app.db.query(
      'INSERT INTO notes (id, user_id, title, body, pinned) VALUES ($1, $2, $3, $4, $5)',
      [id, user.id, body.title, body.body, body.pinned],
    );
    const created = await app.db.query<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
    reply.status(201).send({ note: dto(created.rows[0]!) });
  });

  app.put('/api/notes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = noteUpdateSchema.parse(request.body ?? {});
    const existing = await app.db.query<NoteRow>('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!existing.rows[0]) throw notFound('یادداشت پیدا نشد.');
    await app.db.query(
      `UPDATE notes SET title = $1, body = $2, pinned = $3, updated_at = now() WHERE id = $4`,
      [
        body.title ?? existing.rows[0].title,
        body.body ?? existing.rows[0].body,
        body.pinned ?? existing.rows[0].pinned,
        id,
      ],
    );
    const updated = await app.db.query<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
    reply.send({ note: dto(updated.rows[0]!) });
  });

  app.delete('/api/notes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await app.db.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, user.id]);
    reply.send({ ok: true });
  });
}
