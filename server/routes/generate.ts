import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { getDbClient } from '../db/client';
import { decryptApiKey } from '../lib/apiKeyCrypto';
import {
  buildScriptPrompt,
  OBJETIVOS,
  AUDIENCIAS,
  FORMATOS,
  DURACIONES_REEL,
  type Objetivo,
  type Audiencia,
  type Formato,
} from '../../services/brandVoice';

const router = Router();

const MAX_TOPIC_LENGTH = 500;

router.post('/', rateLimit, requireAuth, async (req: Request, res: Response) => {
  const { topic, objetivo, audiencia, formato, duracion } = req.body ?? {};

  if (typeof topic !== 'string' || !topic.trim()) {
    res.status(400).json({ error: 'Falta el tema.' }); return;
  }
  if (topic.length > MAX_TOPIC_LENGTH) {
    res.status(400).json({ error: `El tema no puede superar los ${MAX_TOPIC_LENGTH} caracteres.` }); return;
  }
  if (!OBJETIVOS.includes(objetivo)) {
    res.status(400).json({ error: 'Objetivo inválido.' }); return;
  }
  if (!AUDIENCIAS.includes(audiencia)) {
    res.status(400).json({ error: 'Audiencia inválida.' }); return;
  }
  if (!FORMATOS.includes(formato)) {
    res.status(400).json({ error: 'Formato inválido.' }); return;
  }
  const duracionNum = formato === 'reel' ? Number(duracion) : undefined;
  if (formato === 'reel' && !DURACIONES_REEL.includes(duracionNum as any)) {
    res.status(400).json({ error: 'Duración de reel inválida.' }); return;
  }

  const userId = req.userId!;
  const db = getDbClient();

  const userResult = await db.execute({
    sql: 'SELECT role, plan_status, ai_generations_used, ai_generations_limit, gemini_api_key_enc FROM users WHERE id = ?',
    args: [userId],
  });
  const user = userResult.rows[0] as any;
  if (!user) {
    res.status(401).json({ error: 'No autenticado.' }); return;
  }

  const isPrivileged = user.role === 'admin' || user.role === 'superadmin';

  // Si el usuario configuró su propia API key, se usa esa (sin consumir
  // cuota del plan). Si no — o si la guardada ya no se puede descifrar
  // (p. ej. rotación del secreto) — se usa la key del servidor bajo las
  // reglas del plan; el estado ilegible se reporta en GET /api/settings/apikey.
  const ownKey: string | null = user.gemini_api_key_enc
    ? decryptApiKey(user.gemini_api_key_enc)
    : null;

  const usesOwnKey = ownKey !== null;
  const limit = Number(user.ai_generations_limit) || 0;
  const used = Number(user.ai_generations_used) || 0;

  if (!isPrivileged && !usesOwnKey) {
    if (user.plan_status !== 'active') {
      res.status(403).json({ error: 'Tu suscripción no está activa.' }); return;
    }
    if (limit <= 0) {
      res.status(403).json({ error: 'Tu plan no incluye generación con IA. Configura tu propia API key de Gemini o actualiza tu plan.' }); return;
    }
    if (used >= limit) {
      res.status(429).json({ error: 'Alcanzaste el límite de generaciones con IA de tu plan. Configura tu propia API key de Gemini para seguir generando.' }); return;
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: ownKey ?? process.env.GEMINI_API_KEY });
    const prompt = buildScriptPrompt({
      topic: topic.trim(),
      formato: formato as Formato,
      objetivo: objetivo as Objetivo,
      audiencia: audiencia as Audiencia,
      duracion: duracionNum,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    if (!isPrivileged && !usesOwnKey) {
      await db.execute({
        sql: 'UPDATE users SET ai_generations_used = ai_generations_used + 1, updated_at = ? WHERE id = ?',
        args: [Date.now(), userId],
      });
    }

    res.status(200).json({ script: response.text || '' });
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    res.status(500).json({ error: 'Falló la generación del guion.' });
  }
});

export default router;
