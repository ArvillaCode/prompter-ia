import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { validateScriptContent, validateScriptTitle } from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit);
router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, title, content, updated_at, created_at FROM scripts WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });

  const scripts = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));

  res.status(200).json({ scripts });
});

router.post('/', async (req: Request, res: Response) => {
  const { id, title, content, updatedAt } = req.body ?? {};
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'ID del guion requerido.' }); return;
  }

  const titleError = validateScriptTitle(title);
  if (titleError) { res.status(400).json({ error: titleError }); return; }

  const contentError = validateScriptContent(content);
  if (contentError) { res.status(400).json({ error: contentError }); return; }

  const userId = req.userId!;
  const now = Date.now();
  const finalUpdatedAt = typeof updatedAt === 'number' ? updatedAt : now;
  const db = getDbClient();

  await db.execute({
    sql: 'INSERT INTO scripts (id, user_id, title, content, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, userId, title, content, finalUpdatedAt, now],
  });

  res.status(201).json({ script: { id, title, content, updatedAt: finalUpdatedAt, createdAt: now } });
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.userId!;
  const { title, content, updatedAt } = req.body ?? {};

  const db = getDbClient();
  const existing = await db.execute({
    sql: 'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Guion no encontrado.' }); return;
  }

  const titleError = validateScriptTitle(title);
  if (titleError) { res.status(400).json({ error: titleError }); return; }

  const contentError = validateScriptContent(content);
  if (contentError) { res.status(400).json({ error: contentError }); return; }

  const finalUpdatedAt = typeof updatedAt === 'number' ? updatedAt : Date.now();
  await db.execute({
    sql: 'UPDATE scripts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: [title, content, finalUpdatedAt, id, userId],
  });

  res.status(200).json({ script: { id, title, content, updatedAt: finalUpdatedAt } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.userId!;
  const db = getDbClient();

  const existing = await db.execute({
    sql: 'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Guion no encontrado.' }); return;
  }

  await db.execute({
    sql: 'DELETE FROM scripts WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });

  res.status(200).json({ success: true, id });
});

export default router;
