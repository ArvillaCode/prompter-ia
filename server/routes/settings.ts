import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { validateSettings } from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit);
router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT settings FROM settings WHERE user_id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    res.status(200).json({ settings: null }); return;
  }

  const settings = JSON.parse((result.rows[0] as any).settings);
  res.status(200).json({ settings });
});

router.put('/', async (req: Request, res: Response) => {
  const { settings } = req.body ?? {};
  const settingsError = validateSettings(settings);
  if (settingsError) { res.status(400).json({ error: settingsError }); return; }

  const userId = req.userId!;
  const settingsJson = JSON.stringify(settings);
  const now = Date.now();
  const db = getDbClient();

  await db.execute({
    sql: 'INSERT INTO settings (user_id, settings, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = ?',
    args: [userId, settingsJson, now, settingsJson, now],
  });

  res.status(200).json({ settings });
});

export default router;
