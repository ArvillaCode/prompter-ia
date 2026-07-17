import { getDbClient } from './db/client';
import { getAuthUserIdFromRequest } from './lib/auth';
import { validateSettings, validateScriptTitle, validateScriptContent } from './lib/validate';
import { applyRateLimit } from './lib/rateLimit';

interface SyncRequest {
  scripts: Array<{
    id: string;
    title: string;
    content: string;
    updatedAt: number;
  }>;
  settings: any;
  lastSyncAt: number | null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  if (!applyRateLimit(req, res)) return;

  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const { scripts: clientScripts, settings: clientSettings } = (req.body ?? {}) as SyncRequest;

  const db = getDbClient();

  // --- Sync scripts: last-write-wins ---
  // 1. Get all server scripts for this user
  const serverResult = await db.execute({
    sql: 'SELECT id, title, content, updated_at, created_at FROM scripts WHERE user_id = ?',
    args: [userId],
  });

  const serverScriptsMap = new Map<string, any>();
  for (const row of serverResult.rows) {
    serverScriptsMap.set((row as any).id, row);
  }

  const clientScriptIds = new Set(clientScripts?.map((s) => s.id) ?? []);

  // 2. Upsert client scripts (if client updatedAt >= server updatedAt)
  for (const clientScript of clientScripts ?? []) {
    const titleError = validateScriptTitle(clientScript.title);
    if (titleError) continue;
    const contentError = validateScriptContent(clientScript.content);
    if (contentError) continue;

    const serverScript = serverScriptsMap.get(clientScript.id);
    if (!serverScript) {
      // New script from client - insert
      const now = Date.now();
      await db.execute({
        sql: 'INSERT INTO scripts (id, user_id, title, content, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [clientScript.id, userId, clientScript.title, clientScript.content, clientScript.updatedAt, now],
      });
    } else {
      // Existing - update if client is newer or equal (last-write-wins)
      if (clientScript.updatedAt >= (serverScript as any).updated_at) {
        await db.execute({
          sql: 'UPDATE scripts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          args: [clientScript.title, clientScript.content, clientScript.updatedAt, clientScript.id, userId],
        });
      }
    }
  }

  // 3. Delete server scripts not in client (client deleted them)
  for (const [serverId] of serverScriptsMap) {
    if (!clientScriptIds.has(serverId)) {
      await db.execute({
        sql: 'DELETE FROM scripts WHERE id = ? AND user_id = ?',
        args: [serverId, userId],
      });
    }
  }

  // --- Sync settings ---
  if (clientSettings !== undefined && clientSettings !== null) {
    const settingsError = validateSettings(clientSettings);
    if (!settingsError) {
      const settingsJson = JSON.stringify(clientSettings);
      const now = Date.now();
      await db.execute({
        sql: 'INSERT INTO settings (user_id, settings, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = ?',
        args: [userId, settingsJson, now, settingsJson, now],
      });
    }
  }

  // --- Return server's current full state ---
  const finalScripts = await db.execute({
    sql: 'SELECT id, title, content, updated_at, created_at FROM scripts WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });

  const finalSettingsResult = await db.execute({
    sql: 'SELECT settings FROM settings WHERE user_id = ?',
    args: [userId],
  });

  const finalSettings =
    finalSettingsResult.rows.length > 0
      ? JSON.parse((finalSettingsResult.rows[0] as any).settings)
      : null;

  return res.status(200).json({
    scripts: finalScripts.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })),
    settings: finalSettings,
    syncTimestamp: Date.now(),
  });
}
