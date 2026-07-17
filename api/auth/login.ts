import { compare } from 'bcryptjs';
import { getDbClient } from '../db/client';
import { signToken } from '../lib/auth';
import { validateEmail, validatePassword } from '../lib/validate';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { email, password } = req.body ?? {};

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const emailLower = (email as string).trim().toLowerCase();

  const db = getDbClient();

  const result = await db.execute({
    sql: 'SELECT id, email, password_hash, display_name FROM users WHERE email_lower = ?',
    args: [emailLower],
  });

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const user = result.rows[0] as any;
  const passwordMatch = await compare(password as string, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const token = await signToken({ userId: user.id, email: user.email });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
    },
  });
}
