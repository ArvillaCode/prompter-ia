import { GoogleGenAI } from '@google/genai';

// Vercel serverless function: keeps the Gemini API key on the server.
// Set GEMINI_API_KEY in the Vercel project settings (Environment Variables).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, tone, audience } = req.body ?? {};
  if (typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Falta el tema.' });
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

    return res.status(200).json({ script: response.text || '' });
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    return res.status(500).json({ error: 'Falló la generación del guion.' });
  }
}
