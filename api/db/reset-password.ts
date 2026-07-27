import { hash } from 'bcryptjs';
import { getDbClient } from './client';

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Uso: node --import tsx api/db/reset-password.ts <email> <nueva-contraseña>');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('La nueva contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const db = getDbClient();
  const emailLower = email.trim().toLowerCase();

  const result = await db.execute({
    sql: 'SELECT id, email, role, is_active FROM users WHERE email_lower = ?',
    args: [emailLower],
  });

  if (result.rows.length === 0) {
    console.error(`No existe ningún usuario registrado con el email: ${email}`);
    process.exit(1);
  }

  const user = result.rows[0] as any;
  const passwordHash = await hash(newPassword, 10);

  await db.execute({
    sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    args: [passwordHash, Date.now(), user.id],
  });

  console.log(`Listo: la contraseña de ${user.email} (rol: '${user.role}') fue restablecida.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
