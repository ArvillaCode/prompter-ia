import { hash } from 'bcryptjs';
import { getDbClient } from '../db/client';
import { signToken } from '../lib/auth';
import { validateEmail, validatePassword } from '../lib/validate';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { email, password, displayName } = req.body ?? {};

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const normalizedEmail = (email as string).trim();
  const emailLower = normalizedEmail.toLowerCase();

  const db = getDbClient();

  // Check if email already exists
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email_lower = ?',
    args: [emailLower],
  });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Este correo ya está registrado.' });
  }

  const passwordHash = await hash(password as string, 10);
  const now = Date.now();
  const id = crypto.randomUUID();

  await db.execute({
    sql: 'INSERT INTO users (id, email, email_lower, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, normalizedEmail, emailLower, passwordHash, (displayName as string)?.trim() || null, now, now],
  });

  const token = await signToken({ userId: id, email: normalizedEmail });

  return res.status(201).json({
    token,
    user: {
      id,
      email: normalizedEmail,
      displayName: (displayName as string)?.trim() || null,
    },
  });
}
