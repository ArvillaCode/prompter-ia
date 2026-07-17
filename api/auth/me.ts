import { getDbClient } from '../db/client';
import { getAuthUserIdFromRequest } from '../lib/auth';
import { applyRateLimit } from '../lib/rateLimit';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  if (!applyRateLimit(req, res)) return;

  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const user = result.rows[0] as any;
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
      role: user.role || 'user',
    },
  });
}
