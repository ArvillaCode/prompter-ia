import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { validateSettings, validateScriptTitle, validateScriptContent } from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/', rateLimit, requireAuth, async (req: Request, res: Response) => {
  const { scripts: clientScripts, settings: clientSettings } = req.body ?? {};
  const userId = req.userId!;
  const db = getDbClient();

  const serverResult = await db.execute({
    sql: 'SELECT id, title, content, updated_at, created_at FROM scripts WHERE user_id = ?',
    args: [userId],
  });

  const serverScriptsMap = new Map<string, any>();
  for (const row of serverResult.rows) {
    serverScriptsMap.set((row as any).id, row);
  }

  const clientScriptIds = new Set((clientScripts as any[])?.map((s: any) => s.id) ?? []);

  for (const clientScript of (clientScripts as any[]) ?? []) {
    const titleError = validateScriptTitle(clientScript.title);
    if (titleError) continue;
    const contentError = validateScriptContent(clientScript.content);
    if (contentError) continue;

    const serverScript = serverScriptsMap.get(clientScript.id);
    if (!serverScript) {
      const now = Date.now();
      await db.execute({
        sql: 'INSERT INTO scripts (id, user_id, title, content, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [clientScript.id, userId, clientScript.title, clientScript.content, clientScript.updatedAt, now],
      });
    } else {
      if (clientScript.updatedAt >= (serverScript as any).updated_at) {
        await db.execute({
          sql: 'UPDATE scripts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          args: [clientScript.title, clientScript.content, clientScript.updatedAt, clientScript.id, userId],
        });
      }
    }
  }

  for (const [serverId] of serverScriptsMap) {
    if (!clientScriptIds.has(serverId)) {
      await db.execute({
        sql: 'DELETE FROM scripts WHERE id = ? AND user_id = ?',
        args: [serverId, userId],
      });
    }
  }

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

  const finalScripts = await db.execute({
    sql: 'SELECT id, title, content, updated_at, created_at FROM scripts WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });

  const finalSettingsResult = await db.execute({
    sql: 'SELECT settings FROM settings WHERE user_id = ?',
    args: [userId],
  });

  const finalSettings = finalSettingsResult.rows.length > 0
    ? JSON.parse((finalSettingsResult.rows[0] as any).settings)
    : null;

  res.status(200).json({
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
});

export default router;
