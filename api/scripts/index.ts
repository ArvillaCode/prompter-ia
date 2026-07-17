import { getDbClient } from '../db/client';
import { getAuthUserIdFromRequest } from '../lib/auth';
import { validateScriptContent, validateScriptTitle } from '../lib/validate';

export default async function handler(req: any, res: any) {
  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const db = getDbClient();

  if (req.method === 'GET') {
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

    return res.status(200).json({ scripts });
  }

  if (req.method === 'POST') {
    const { id, title, content, updatedAt } = req.body ?? {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID del guion requerido.' });
    }

    const titleError = validateScriptTitle(title);
    if (titleError) return res.status(400).json({ error: titleError });

    const contentError = validateScriptContent(content);
    if (contentError) return res.status(400).json({ error: contentError });

    const now = Date.now();
    const finalUpdatedAt = typeof updatedAt === 'number' ? updatedAt : now;

    await db.execute({
      sql: 'INSERT INTO scripts (id, user_id, title, content, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, userId, title, content, finalUpdatedAt, now],
    });

    return res.status(201).json({
      script: { id, title, content, updatedAt: finalUpdatedAt, createdAt: now },
    });
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
