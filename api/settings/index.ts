import { getDbClient } from '../db/client';
import { getAuthUserIdFromRequest } from '../lib/auth';
import { validateSettings } from '../lib/validate';

export default async function handler(req: any, res: any) {
  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const db = getDbClient();

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT settings FROM settings WHERE user_id = ?',
      args: [userId],
    });

    if (result.rows.length === 0) {
      return res.status(200).json({ settings: null });
    }

    const settings = JSON.parse((result.rows[0] as any).settings);
    return res.status(200).json({ settings });
  }

  if (req.method === 'PUT') {
    const { settings } = req.body ?? {};

    const settingsError = validateSettings(settings);
    if (settingsError) return res.status(400).json({ error: settingsError });

    const settingsJson = JSON.stringify(settings);
    const now = Date.now();

    await db.execute({
      sql: 'INSERT INTO settings (user_id, settings, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = ?',
      args: [userId, settingsJson, now, settingsJson, now],
    });

    return res.status(200).json({ settings });
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
