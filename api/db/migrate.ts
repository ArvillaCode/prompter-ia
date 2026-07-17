import { readFileSync, readdirSync } from 'fs';
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
  const migrationsDir = resolve(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const db = getDbClient();

  for (const file of files) {
    const sqlPath = resolve(migrationsDir, file);
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(`Running ${file}...`);
    await db.executeMultiple(sql);
    console.log(`  ${file} completed.`);
  }

  console.log('All migrations completed successfully.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
