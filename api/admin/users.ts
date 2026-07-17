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

  // Verify admin role
  const db = getDbClient();
  const userResult = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?',
    args: [userId],
  });

  const currentUser = userResult.rows[0] as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at DESC',
  });

  const users = result.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role || 'user',
    createdAt: row.created_at,
  }));

  return res.status(200).json({ users });
}
