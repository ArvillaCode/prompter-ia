import { randomBytes } from 'node:crypto';
import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { validateLicenseCode, normalizeLicenseCode } from '../../api/lib/validate';

const router = Router();

router.use(rateLimit);
router.use(requireAuth);

async function getCallerRole(req: Request): Promise<string | null> {
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?',
    args: [req.userId!],
  });
  const user = result.rows[0] as any;
  return user?.role ?? null;
}

async function requireAdmin(req: Request, res: Response, next: () => void) {
  const role = await getCallerRole(req);
  if (role !== 'admin' && role !== 'superadmin') {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' }); return;
  }
  next();
}

async function requireSuperadmin(req: Request, res: Response, next: () => void) {
  const role = await getCallerRole(req);
  if (role !== 'superadmin') {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de superadministrador.' }); return;
  }
  next();
}

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, plan, plan_status, ai_generations_used, is_active, license_expires_at, created_at FROM users ORDER BY created_at DESC',
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
    licenseExpiresAt: Number(row.license_expires_at) || null,
    createdAt: row.created_at,
  }));

  res.status(200).json({ users });
});

router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, plan, plan_status, ai_generations_used, max_scripts, is_active, license_expires_at, created_at FROM users WHERE id = ?',
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
      licenseExpiresAt: Number(row.license_expires_at) || null,
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

// ==================== Licencias ====================

const VALID_DURATIONS = [30, 90, 365];
const DAY_MS = 86_400_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1 (ambiguos)

function generateLicenseCode(): string {
  const bytes = randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `PP-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const MASKED_LICENSE_CODE = 'PP-****-****-****';

function mapLicense(row: any, canSeeCode: boolean) {
  // Solo un código 'available' es una credencial usable — un admin sin
  // permiso de superadmin no debe poder leerlo y usarlo/repartirlo, ya
  // que crear/asignar licencias está restringido a requireSuperadmin.
  const exposesCode = canSeeCode || row.status !== 'available';
  return {
    id: row.id,
    code: exposesCode ? row.code : MASKED_LICENSE_CODE,
    durationDays: Number(row.duration_days),
    status: row.status,
    createdAt: Number(row.created_at),
    activatedAt: Number(row.activated_at) || null,
    expiresAt: Number(row.expires_at) || null,
    usedById: row.used_by || null,
    usedByEmail: row.user_email || null,
  };
}

router.get('/licenses', requireAdmin, async (req: Request, res: Response) => {
  const role = await getCallerRole(req);
  const db = getDbClient();
  const result = await db.execute(
    `SELECT l.id, l.code, l.duration_days, l.status, l.created_at, l.activated_at, l.expires_at, l.used_by, u.email AS user_email
     FROM licenses l LEFT JOIN users u ON u.id = l.used_by
     ORDER BY l.created_at DESC`
  );
  res.status(200).json({ licenses: result.rows.map(row => mapLicense(row, role === 'superadmin')) });
});

router.post('/licenses', requireSuperadmin, async (req: Request, res: Response) => {
  const { durationDays } = req.body ?? {};
  const duration = Number(durationDays);
  if (!VALID_DURATIONS.includes(duration)) {
    res.status(400).json({ error: 'Duración inválida. Debe ser 30, 90 o 365 días.' }); return;
  }

  const db = getDbClient();
  const now = Date.now();

  // Reintenta ante la improbable colisión de código (code es UNIQUE).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLicenseCode();
    try {
      const id = crypto.randomUUID();
      await db.execute({
        sql: "INSERT INTO licenses (id, code, duration_days, status, created_by, created_at) VALUES (?, ?, ?, 'available', ?, ?)",
        args: [id, code, duration, req.userId!, now],
      });
      res.status(201).json({
        license: {
          id, code, durationDays: duration, status: 'available',
          createdAt: now, activatedAt: null, expiresAt: null, usedById: null, usedByEmail: null,
        },
      });
      return;
    } catch (err: any) {
      if (attempt === 4) throw err;
    }
  }
});

router.patch('/licenses/:id/revoke', requireSuperadmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, status, used_by FROM licenses WHERE id = ?',
    args: [id],
  });
  const license = result.rows[0] as any;
  if (!license) {
    res.status(404).json({ error: 'Licencia no encontrada.' }); return;
  }
  if (license.status === 'revoked') {
    res.status(400).json({ error: 'Esta licencia ya está revocada.' }); return;
  }

  const now = Date.now();
  await db.execute({
    sql: "UPDATE licenses SET status = 'revoked' WHERE id = ?",
    args: [id],
  });
  // Si estaba en uso, corta el acceso del usuario de inmediato.
  if (license.used_by) {
    await db.execute({
      sql: 'UPDATE users SET license_expires_at = ?, updated_at = ? WHERE id = ? AND license_id = ?',
      args: [now, now, license.used_by, id],
    });
  }

  res.status(200).json({ success: true });
});

router.post('/users/:id/assign-license', requireSuperadmin, async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const { code } = req.body ?? {};

  const codeError = validateLicenseCode(code);
  if (codeError) { res.status(400).json({ error: codeError }); return; }
  const normalized = normalizeLicenseCode(code);

  const db = getDbClient();
  const userResult = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [userId],
  });
  if (userResult.rows.length === 0) {
    res.status(404).json({ error: 'Usuario no encontrado.' }); return;
  }

  const licenseResult = await db.execute({
    sql: 'SELECT id, duration_days, status FROM licenses WHERE code = ?',
    args: [normalized],
  });
  const license = licenseResult.rows[0] as any;
  if (!license) {
    res.status(404).json({ error: 'El código de licencia no existe.' }); return;
  }
  if (license.status !== 'available') {
    res.status(400).json({ error: 'Esta licencia ya fue utilizada o revocada.' }); return;
  }

  const now = Date.now();
  const expiresAt = now + Number(license.duration_days) * DAY_MS;

  // Transacción: reclamar la licencia y actualizar al usuario es todo-o-nada.
  const tx = await db.transaction('write');
  try {
    const claim = await tx.execute({
      sql: "UPDATE licenses SET status = 'used', used_by = ?, activated_at = ?, expires_at = ? WHERE id = ? AND status = 'available'",
      args: [userId, now, expiresAt, license.id],
    });
    if (claim.rowsAffected === 0) {
      await tx.rollback();
      res.status(409).json({ error: 'Esta licencia acaba de ser utilizada.' }); return;
    }
    await tx.execute({
      sql: 'UPDATE users SET license_id = ?, license_expires_at = ?, updated_at = ? WHERE id = ?',
      args: [license.id, expiresAt, now, userId],
    });
    await tx.commit();
  } finally {
    tx.close();
  }

  res.status(200).json({ success: true, licenseExpiresAt: expiresAt });
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

router.get('/stats/detailed', requireAdmin, async (req: Request, res: Response) => {
  const db = getDbClient();
  const range = (req.query.range as string) || 'week';
  const now = Date.now();

  let rangeStart: number;
  let groupFormat: string;

  switch (range) {
    case 'day':
      rangeStart = now - 86_400_000;
      groupFormat = '%Y-%m-%d %H:00';
      break;
    case 'week':
      rangeStart = now - 7 * 86_400_000;
      groupFormat = '%Y-%m-%d';
      break;
    case 'month':
      rangeStart = now - 30 * 86_400_000;
      groupFormat = '%Y-%m-%d';
      break;
    case 'year':
      rangeStart = now - 365 * 86_400_000;
      groupFormat = '%Y-%m';
      break;
    default:
      rangeStart = now - 7 * 86_400_000;
      groupFormat = '%Y-%m-%d';
  }

  const [totalUsers, activeUsers, totalScripts, proUsers, userRegistrations, licensesByDuration, licensesByStatus, latestUsers, latestLicenses] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM users'),
    db.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
    db.execute('SELECT COUNT(*) as count FROM scripts'),
    db.execute("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'"),
    db.execute({
      sql: `SELECT strftime('${groupFormat}', created_at / 1000, 'unixepoch') as bucket, COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ? GROUP BY bucket ORDER BY bucket`,
      args: [rangeStart, now],
    }),
    db.execute('SELECT duration_days, COUNT(*) as count FROM licenses GROUP BY duration_days ORDER BY duration_days'),
    db.execute({
      sql: `SELECT CASE WHEN status = 'used' AND expires_at < ? THEN 'expired' WHEN status = 'used' THEN 'active' ELSE status END as status_group, COUNT(*) as count FROM licenses GROUP BY status_group ORDER BY status_group`,
      args: [now],
    }),
    db.execute({
      sql: 'SELECT id, email, display_name as displayName, plan, created_at as createdAt FROM users ORDER BY created_at DESC LIMIT 5',
    }),
    db.execute({
      sql: 'SELECT id, code, duration_days as durationDays, status, created_at as createdAt FROM licenses ORDER BY created_at DESC LIMIT 5',
    }),
  ]);

  res.status(200).json({
    totalUsers: (totalUsers.rows[0] as any).count,
    activeUsers: (activeUsers.rows[0] as any).count,
    totalScripts: (totalScripts.rows[0] as any).count,
    proUsers: (proUsers.rows[0] as any).count,
    userRegistrations: userRegistrations.rows.map((r: any) => ({ bucket: r.bucket, count: r.count })),
    licensesByDuration: licensesByDuration.rows.map((r: any) => ({ durationDays: r.duration_days, count: r.count })),
    licensesByStatus: licensesByStatus.rows.map((r: any) => ({ status: r.status_group, count: r.count })),
    latestUsers: latestUsers.rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      plan: r.plan,
      createdAt: Number(r.createdAt),
    })),
    latestLicenses: latestLicenses.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      durationDays: r.durationDays,
      status: r.status,
      createdAt: Number(r.createdAt),
    })),
  });
});

export default router;
