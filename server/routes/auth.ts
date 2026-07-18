import { Router, Request, Response } from 'express';
import { hash, compare } from 'bcryptjs';
import { getDbClient } from '../db/client';
import { signToken, requireAuth } from '../middleware/auth';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  sanitizeDisplayName,
  validateLicenseCode,
  normalizeLicenseCode,
} from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

const DAY_MS = 86_400_000;

router.post('/register', rateLimit, async (req: Request, res: Response) => {
  const { email, password, displayName, licenseCode } = req.body ?? {};

  const emailError = validateEmail(email);
  if (emailError) { res.status(400).json({ error: emailError }); return; }

  const passwordError = validatePassword(password);
  if (passwordError) { res.status(400).json({ error: passwordError }); return; }

  const nameError = validateDisplayName(displayName);
  if (nameError) { res.status(400).json({ error: nameError }); return; }

  const licenseError = validateLicenseCode(licenseCode);
  if (licenseError) { res.status(400).json({ error: licenseError }); return; }

  const normalizedEmail = (email as string).trim();
  const emailLower = normalizedEmail.toLowerCase();
  const safeDisplayName = sanitizeDisplayName(displayName);
  const code = normalizeLicenseCode(licenseCode);
  const db = getDbClient();

  const licenseResult = await db.execute({
    sql: 'SELECT id, duration_days, status FROM licenses WHERE code = ?',
    args: [code],
  });
  const license = licenseResult.rows[0] as any;
  if (!license) {
    res.status(400).json({ error: 'El código de licencia no existe.' }); return;
  }
  if (license.status !== 'available') {
    res.status(400).json({ error: 'Esta licencia ya fue utilizada o revocada.' }); return;
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email_lower = ?',
    args: [emailLower],
  });
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Este correo ya está registrado.' }); return;
  }

  const passwordHash = await hash(password as string, 10);
  const now = Date.now();
  const id = crypto.randomUUID();
  const expiresAt = now + Number(license.duration_days) * DAY_MS;

  // Transacción: consumir la licencia y crear el usuario es todo-o-nada.
  // Si el proceso muere a mitad, el rollback implícito evita licencias
  // "quemadas" apuntando a usuarios que nunca se crearon.
  const tx = await db.transaction('write');
  try {
    const claim = await tx.execute({
      sql: "UPDATE licenses SET status = 'used', used_by = ?, activated_at = ?, expires_at = ? WHERE id = ? AND status = 'available'",
      args: [id, now, expiresAt, license.id],
    });
    if (claim.rowsAffected === 0) {
      await tx.rollback();
      res.status(409).json({ error: 'Esta licencia acaba de ser utilizada por otra persona.' }); return;
    }
    await tx.execute({
      sql: 'INSERT INTO users (id, email, email_lower, password_hash, display_name, role, license_id, license_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, normalizedEmail, emailLower, passwordHash, safeDisplayName, 'user', license.id, expiresAt, now, now],
    });
    await tx.commit();
  } catch (err: any) {
    if (String(err?.message || '').includes('UNIQUE')) {
      res.status(409).json({ error: 'Este correo ya está registrado.' }); return;
    }
    throw err;
  } finally {
    tx.close();
  }

  const token = await signToken({ userId: id, email: normalizedEmail });

  res.status(201).json({
    token,
    user: {
      id,
      email: normalizedEmail,
      displayName: safeDisplayName,
      role: 'user',
      licenseExpiresAt: expiresAt,
    },
  });
});

router.post('/login', rateLimit, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  const emailError = validateEmail(email);
  if (emailError) { res.status(400).json({ error: emailError }); return; }

  const passwordError = validatePassword(password);
  if (passwordError) { res.status(400).json({ error: passwordError }); return; }

  const emailLower = (email as string).trim().toLowerCase();
  const db = getDbClient();

  const result = await db.execute({
    sql: 'SELECT id, email, password_hash, display_name, role, is_active, license_expires_at FROM users WHERE email_lower = ?',
    args: [emailLower],
  });

  const user = result.rows[0] as any;
  const dummyHash = '$2a$10$000000000000000000000000000000000000000000000';
  const passwordHash = user?.password_hash ?? dummyHash;
  const passwordMatch = user ? await compare(password as string, passwordHash) : false;

  if (!user || !passwordMatch) {
    res.status(401).json({ error: 'Correo o contraseña incorrectos.' }); return;
  }

  if (user.is_active === 0) {
    res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' }); return;
  }

  const isPrivileged = user.role === 'admin' || user.role === 'superadmin';
  const licenseExpiresAt = Number(user.license_expires_at) || null;
  if (!isPrivileged) {
    if (!licenseExpiresAt) {
      res.status(403).json({ error: 'Tu cuenta no tiene una licencia activa. Contacta al administrador.' }); return;
    }
    if (licenseExpiresAt < Date.now()) {
      const fecha = new Date(licenseExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      res.status(403).json({ error: `Tu licencia venció el ${fecha}. Contacta al administrador para renovarla.` }); return;
    }
  }

  const token = await signToken({ userId: user.id, email: user.email });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
      role: user.role || 'user',
      licenseExpiresAt,
    },
  });
});

router.get('/me', rateLimit, requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role, license_expires_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'No autenticado.' }); return;
  }

  const user = result.rows[0] as any;
  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
      role: user.role || 'user',
      licenseExpiresAt: Number(user.license_expires_at) || null,
    },
  });
});

export default router;
