import { getDbClient } from '../db/client';
import { getAuthUserIdFromRequest } from '../lib/auth';
import { validateScriptContent, validateScriptTitle } from '../lib/validate';

export default async function handler(req: any, res: any) {
  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID del guion requerido.' });
  }

  const db = getDbClient();

  // Verify ownership
  const existing = await db.execute({
    sql: 'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Guion no encontrado.' });
  }

  if (req.method === 'PUT') {
    const { title, content, updatedAt } = req.body ?? {};

    const titleError = validateScriptTitle(title);
    if (titleError) return res.status(400).json({ error: titleError });

    const contentError = validateScriptContent(content);
    if (contentError) return res.status(400).json({ error: contentError });

    const finalUpdatedAt = typeof updatedAt === 'number' ? updatedAt : Date.now();

    await db.execute({
      sql: 'UPDATE scripts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      args: [title, content, finalUpdatedAt, id, userId],
    });

    return res.status(200).json({
      script: { id, title, content, updatedAt: finalUpdatedAt },
    });
  }

  if (req.method === 'DELETE') {
    await db.execute({
      sql: 'DELETE FROM scripts WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });

    return res.status(200).json({ success: true, id });
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
