import { Router, Request, Response } from 'express';
import { hash, compare } from 'bcryptjs';
import { getDbClient } from '../db/client';
import { signToken, requireAuth } from '../middleware/auth';
import { validateEmail, validatePassword, validateDisplayName, sanitizeDisplayName } from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/register', rateLimit, async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body ?? {};

  const emailError = validateEmail(email);
  if (emailError) { res.status(400).json({ error: emailError }); return; }

  const passwordError = validatePassword(password);
  if (passwordError) { res.status(400).json({ error: passwordError }); return; }

  const nameError = validateDisplayName(displayName);
  if (nameError) { res.status(400).json({ error: nameError }); return; }

  const normalizedEmail = (email as string).trim();
  const emailLower = normalizedEmail.toLowerCase();
  const safeDisplayName = sanitizeDisplayName(displayName);
  const db = getDbClient();

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

  await db.execute({
    sql: 'INSERT INTO users (id, email, email_lower, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, normalizedEmail, emailLower, passwordHash, safeDisplayName, 'user', now, now],
  });

  const token = await signToken({ userId: id, email: normalizedEmail });

  res.status(201).json({
    token,
    user: { id, email: normalizedEmail, displayName: safeDisplayName, role: 'user' },
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
    sql: 'SELECT id, email, password_hash, display_name, role, is_active FROM users WHERE email_lower = ?',
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

  const token = await signToken({ userId: user.id, email: user.email });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
      role: user.role || 'user',
    },
  });
});

router.get('/me', rateLimit, requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, email, display_name, role FROM users WHERE id = ?',
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
    },
  });
});

export default router;
