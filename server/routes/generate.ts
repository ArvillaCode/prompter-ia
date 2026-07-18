import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/', rateLimit, requireAuth, async (req: Request, res: Response) => {
  const { topic, tone, audience } = req.body ?? {};
  if (typeof topic !== 'string' || !topic.trim()) {
    res.status(400).json({ error: 'Falta el tema.' }); return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
      Escribe un guion de video para un teleprónter.
      Tema: ${topic}
      Tono: ${tone}
      Audiencia Objetivo: ${audience}

      Requisitos de formato:
      - Solo texto plano.
      - Sin descripciones de escena (ej: [Corte a B-roll]).
      - Sin nombres de personajes.
      - Solo las palabras habladas.
      - Mantenlo por debajo de 300 palabras.
      - Hazlo atractivo y natural para leer.
      - IDIOMA: ESPAÑOL.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.status(200).json({ script: response.text || '' });
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    res.status(500).json({ error: 'Falló la generación del guion.' });
  }
});

export default router;
