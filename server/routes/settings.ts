import { Router, Request, Response } from 'express';
import { getDbClient } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { validateSettings, validateGeminiApiKey } from '../../api/lib/validate';
import { rateLimit } from '../middleware/rateLimit';
import { encryptApiKey, decryptApiKey } from '../lib/apiKeyCrypto';

const router = Router();

router.use(rateLimit);
router.use(requireAuth);

// --- API key de Gemini por usuario (cifrada en reposo, nunca se devuelve completa) ---

router.get('/apikey', async (req: Request, res: Response) => {
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT gemini_api_key_enc FROM users WHERE id = ?',
    args: [req.userId!],
  });
  const enc = (result.rows[0] as any)?.gemini_api_key_enc;
  if (!enc) {
    res.status(200).json({ hasKey: false, last4: null }); return;
  }
  const plain = decryptApiKey(enc);
  res.status(200).json({
    hasKey: plain !== null,
    last4: plain ? plain.slice(-4) : null,
  });
});

router.put('/apikey', async (req: Request, res: Response) => {
  const { apiKey } = req.body ?? {};
  const keyError = validateGeminiApiKey(apiKey);
  if (keyError) { res.status(400).json({ error: keyError }); return; }

  const trimmed = (apiKey as string).trim();
  const encrypted = encryptApiKey(trimmed);
  const db = getDbClient();
  await db.execute({
    sql: 'UPDATE users SET gemini_api_key_enc = ?, updated_at = ? WHERE id = ?',
    args: [encrypted, Date.now(), req.userId!],
  });

  res.status(200).json({ hasKey: true, last4: trimmed.slice(-4) });
});

router.delete('/apikey', async (req: Request, res: Response) => {
  const db = getDbClient();
  await db.execute({
    sql: 'UPDATE users SET gemini_api_key_enc = NULL, updated_at = ? WHERE id = ?',
    args: [Date.now(), req.userId!],
  });
  res.status(200).json({ hasKey: false, last4: null });
});

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
