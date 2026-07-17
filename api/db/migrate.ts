import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDbClient } from './client';

// Load .env.local manually (tsx doesn't auto-load it like Vite does)
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local not found, rely on existing env vars
}

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sqlPath = resolve(__dirname, 'migrations', '001_initial.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const db = getDbClient();
  console.log('Running migration 001_initial.sql...');

  // libSQL client supports executing multiple statements
  await db.executeMultiple(sql);

  console.log('Migration completed successfully.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
