import { getDbClient } from './client';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node --import tsx api/db/make-admin.ts <email>');
    process.exit(1);
  }

  const db = getDbClient();
  const emailLower = email.trim().toLowerCase();

  const result = await db.execute({
    sql: 'SELECT id, email, role FROM users WHERE email_lower = ?',
    args: [emailLower],
  });

  if (result.rows.length === 0) {
    console.error(`No existe ningún usuario registrado con el email: ${email}`);
    process.exit(1);
  }

  const user = result.rows[0] as any;
  await db.execute({
    sql: 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    args: ['superadmin', Date.now(), user.id],
  });

  console.log(`Listo: ${user.email} ahora tiene rol 'superadmin' (antes: '${user.role}').`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
