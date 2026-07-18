import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit);
router.use(requireAuth);

async function requireAdmin(req: Request, res: Response, next: () => void) {
  const userId = req.userId!;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?',
    args: [userId],
  });
  const user = result.rows[0] as any;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' }); return;
  }
  next();
}

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, plan, plan_status, ai_generations_used, is_active, created_at FROM users ORDER BY created_at DESC',
  });

  const users = result.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role || 'user',
    plan: row.plan || 'free',
    planStatus: row.plan_status || 'active',
    aiGenerationsUsed: row.ai_generations_used || 0,
    isActive: row.is_active !== 0,
    createdAt: row.created_at,
  }));

  res.status(200).json({ users });
});

router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, plan, plan_status, ai_generations_used, max_scripts, is_active, created_at FROM users WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Usuario no encontrado.' }); return;
  }

  const row = result.rows[0] as any;
  res.status(200).json({
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role || 'user',
      plan: row.plan || 'free',
      planStatus: row.plan_status || 'active',
      aiGenerationsUsed: row.ai_generations_used || 0,
      maxScripts: row.max_scripts || 3,
      isActive: row.is_active !== 0,
      createdAt: row.created_at,
    },
  });
});

router.patch('/users/:id/role', requireAdmin, async (req: Request, res: Response) => {
  const { role } = req.body ?? {};
  if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
    res.status(400).json({ error: 'Rol inválido. Debe ser user, admin o superadmin.' }); return;
  }

  // Only superadmin can assign superadmin
  const userId = req.userId!;
  const db = getDbClient();
  const caller = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?',
    args: [userId],
  });
  const callerUser = caller.rows[0] as any;

  if (role === 'superadmin' && callerUser?.role !== 'superadmin') {
    res.status(403).json({ error: 'Solo un superadmin puede asignar ese rol.' }); return;
  }

  const id = req.params.id as string;
  await db.execute({
    sql: 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    args: [role, Date.now(), id],
  });

  res.status(200).json({ success: true });
});

router.patch('/users/:id/plan', requireAdmin, async (req: Request, res: Response) => {
  const { plan } = req.body ?? {};
  if (!plan || !['free', 'pro', 'team'].includes(plan)) {
    res.status(400).json({ error: 'Plan inválido.' }); return;
  }

  const limits: Record<string, { maxScripts: number; aiGenerations: number }> = {
    free: { maxScripts: 3, aiGenerations: 0 },
    pro: { maxScripts: 999, aiGenerations: 200 },
    team: { maxScripts: 999, aiGenerations: 500 },
  };
  const lim = limits[plan];

  const id = req.params.id as string;
  const db = getDbClient();
  await db.execute({
    sql: 'UPDATE users SET plan = ?, max_scripts = ?, ai_generations_limit = ?, updated_at = ? WHERE id = ?',
    args: [plan, lim.maxScripts, lim.aiGenerations, Date.now(), id],
  });

  res.status(200).json({ success: true });
});

router.patch('/users/:id/toggle-active', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDbClient();
  const user = await db.execute({
    sql: 'SELECT is_active FROM users WHERE id = ?',
    args: [id],
  });
  if (user.rows.length === 0) {
    res.status(404).json({ error: 'Usuario no encontrado.' }); return;
  }

  const current = (user.rows[0] as any).is_active;
  await db.execute({
    sql: 'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?',
    args: [current ? 0 : 1, Date.now(), id],
  });

  res.status(200).json({ success: true, isActive: !current });
});

router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  const db = getDbClient();

  const totalUsers = await db.execute('SELECT COUNT(*) as count FROM users');
  const activeUsers = await db.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
  const totalScripts = await db.execute('SELECT COUNT(*) as count FROM scripts');
  const proUsers = await db.execute("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'");

  res.status(200).json({
    totalUsers: (totalUsers.rows[0] as any).count,
    activeUsers: (activeUsers.rows[0] as any).count,
    totalScripts: (totalScripts.rows[0] as any).count,
    proUsers: (proUsers.rows[0] as any).count,
  });
});

export default router;
