import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../lib/http.js';

type FsRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  kind: 'file' | 'folder';
  content: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type FsNodeDto = {
  id: string;
  parentId: string | null;
  name: string;
  kind: 'file' | 'folder';
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  children: FsNodeDto[];
};

const nameSchema = z
  .string()
  .trim()
  .min(1, 'نام نمی‌تواند خالی باشد.')
  .max(120, 'نام بیش از حد طولانی است.');

const newFolderSchema = z.object({ parentId: z.string().nullable().optional(), name: nameSchema });
const newFileSchema = z.object({
  parentId: z.string().nullable().optional(),
  name: nameSchema,
  content: z.string().max(2_000_000).optional(),
});
const patchNodeSchema = z.object({
  name: nameSchema.optional(),
  parentId: z.string().nullable().optional(),
});

export async function fsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/fs/tree', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const result = await app.db.query<FsRow>(
      'SELECT * FROM fs_nodes WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at',
      [user.id],
    );
    reply.send({ tree: buildForest(result.rows) });
  });

  app.get('/api/fs/trash', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const result = await app.db.query<FsRow>(
      'SELECT * FROM fs_nodes WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [user.id],
    );
    const rows = result.rows;
    const deletedIds = new Set(rows.map((row) => row.id));
    // فقط ریشه‌های سطل زباله برمی‌گردند (فرزندان داخل همان درخت نمایش داده می‌شوند)
    const roots = rows.filter((row) => !row.parent_id || !deletedIds.has(row.parent_id));
    reply.send({ trash: roots.map((row) => toDto(row, rows)) });
  });

  app.post('/api/fs/folders', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const body = newFolderSchema.parse(request.body ?? {});
    const parentId = await resolveParent(app, user.id, body.parentId ?? null);
    await assertNameFree(app, user.id, parentId, body.name);
    const id = crypto.randomUUID();
    await app.db.query(
      `INSERT INTO fs_nodes (id, user_id, parent_id, name, kind, content)
       VALUES ($1, $2, $3, $4, 'folder', '')`,
      [id, user.id, parentId, body.name],
    );
    reply.status(201).send({ node: { id, parentId, name: body.name, kind: 'folder', content: '' } });
  });

  app.post('/api/fs/files', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const body = newFileSchema.parse(request.body ?? {});
    const parentId = await resolveParent(app, user.id, body.parentId ?? null);
    await assertNameFree(app, user.id, parentId, body.name);
    const id = crypto.randomUUID();
    await app.db.query(
      `INSERT INTO fs_nodes (id, user_id, parent_id, name, kind, content)
       VALUES ($1, $2, $3, $4, 'file', $5)`,
      [id, user.id, parentId, body.name, body.content ?? ''],
    );
    reply.status(201).send({ node: { id, parentId, name: body.name, kind: 'file', content: body.content ?? '' } });
  });

  app.patch('/api/fs/nodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = patchNodeSchema.parse(request.body ?? {});
    const node = await loadNode(app, user.id, id);

    if (body.name !== undefined) {
      await assertNameFree(app, user.id, node.parent_id, body.name, id);
      await app.db.query('UPDATE fs_nodes SET name = $1, updated_at = now() WHERE id = $2', [body.name, id]);
    }
    if (body.parentId !== undefined) {
      const parentId = await resolveParent(app, user.id, body.parentId);
      if (parentId) {
        if (parentId === id) throw badRequest('یک پوشه را نمی‌توان داخل خودش قرار داد.');
        if (await isDescendant(app, user.id, id, parentId)) {
          throw badRequest('یک پوشه را نمی‌توان داخل زیرپوشهٔ خودش قرار داد.');
        }
      }
      await app.db.query('UPDATE fs_nodes SET parent_id = $1, updated_at = now() WHERE id = $2', [parentId, id]);
    }
    reply.send({ ok: true });
  });

  app.put('/api/fs/nodes/:id/content', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ content: z.string().max(2_000_000) }).parse(request.body ?? {});
    const node = await loadNode(app, user.id, id);
    if (node.kind !== 'file') throw badRequest('فقط فایل‌ها محتوا دارند.');
    await app.db.query('UPDATE fs_nodes SET content = $1, updated_at = now() WHERE id = $2', [body.content, id]);
    reply.send({ ok: true });
  });

  app.delete('/api/fs/nodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const query = z.object({ permanent: z.coerce.boolean().optional() }).parse(request.query ?? {});
    await loadNode(app, user.id, id);

    if (query.permanent) {
      await app.db.query('DELETE FROM fs_nodes WHERE id = $1', [id]);
    } else {
      // انتقال به سطل زباله: پوشهٔ والد و همهٔ فرزندانش
      await app.db.query('UPDATE fs_nodes SET deleted_at = now() WHERE id = $1', [id]);
      await app.db.query(
        `UPDATE fs_nodes SET deleted_at = now()
         WHERE id IN (
           WITH RECURSIVE sub AS (
             SELECT id FROM fs_nodes WHERE id = $1
             UNION ALL
             SELECT n.id FROM fs_nodes n JOIN sub s ON n.parent_id = s.id
           ) SELECT id FROM sub
         )`,
        [id],
      );
    }
    reply.send({ ok: true });
  });

  app.post('/api/fs/nodes/:id/restore', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireUser(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await loadNode(app, user.id, id, true);
    await app.db.query(
      `UPDATE fs_nodes SET deleted_at = NULL, updated_at = now()
       WHERE id IN (
         WITH RECURSIVE sub AS (
           SELECT id FROM fs_nodes WHERE id = $1
           UNION ALL
           SELECT n.id FROM fs_nodes n JOIN sub s ON n.parent_id = s.id
         ) SELECT id FROM sub
       )`,
      [id],
    );
    reply.send({ ok: true });
  });
}

async function loadNode(app: FastifyInstance, userId: string, id: string, includeDeleted = false): Promise<FsRow> {
  const result = await app.db.query<FsRow>('SELECT * FROM fs_nodes WHERE id = $1 AND user_id = $2', [id, userId]);
  const node = result.rows[0];
  if (!node) throw notFound('گرهٔ مورد نظر پیدا نشد.');
  if (!includeDeleted && node.deleted_at) throw notFound('این مورد در سطل زباله است.');
  return node;
}

async function resolveParent(app: FastifyInstance, userId: string, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  const parent = await loadNode(app, userId, parentId);
  if (parent.kind !== 'folder') throw badRequest(' والد باید یک پوشه باشد.');
  return parent.id;
}

async function assertNameFree(
  app: FastifyInstance,
  userId: string,
  parentId: string | null,
  name: string,
  exceptId?: string,
): Promise<void> {
  const result = await app.db.query<{ id: string }>(
    `SELECT id FROM fs_nodes
     WHERE user_id = $1 AND deleted_at IS NULL AND lower(name) = lower($2)
       AND (CASE WHEN $3::text IS NULL THEN parent_id IS NULL ELSE parent_id = $3::text END)
       AND ($4::text IS NULL OR id <> $4::text)`,
    [userId, name, parentId, exceptId ?? null],
  );
  if (result.rows.length > 0) throw conflict('موردی با این نام در همین مسیر وجود دارد.');
}

async function isDescendant(app: FastifyInstance, userId: string, ancestorId: string, candidateId: string): Promise<boolean> {
  const result = await app.db.query<{ id: string }>(
    `WITH RECURSIVE sub AS (
       SELECT id FROM fs_nodes WHERE id = $1 AND user_id = $3
       UNION ALL
       SELECT n.id FROM fs_nodes n JOIN sub s ON n.parent_id = s.id
     ) SELECT id FROM sub WHERE id = $2`,
    [ancestorId, candidateId, userId],
  );
  return result.rows.length > 0;
}

function toDto(row: FsRow, rows: FsRow[] = []): FsNodeDto {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    kind: row.kind,
    content: row.content,
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    children: rows.filter((child) => child.parent_id === row.id).map((child) => toDto(child, rows)),
  };
}

function buildForest(rows: FsRow[]): FsNodeDto[] {
  const byParent = new Map<string | null, FsRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }
  const build = (parentId: string | null): FsNodeDto[] =>
    (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      kind: row.kind,
      content: row.content,
      createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
      deletedAt: null,
      children: build(row.id),
    }));
  return build(null);
}
