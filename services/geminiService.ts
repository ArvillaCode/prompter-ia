import { buildScriptPrompt, type Formato, type Objetivo, type Audiencia } from './brandVoice';
import { getToken } from './apiService';

export interface GenerateScriptParams {
  topic: string;
  formato: Formato;
  objetivo: Objetivo;
  audiencia: Audiencia;
  duracion?: number;
}

export const generateScript = async (params: GenerateScriptParams): Promise<string> => {
  // In production the key never reaches the browser: the server route
  // /api/generate holds it. Local dev (vite) calls Gemini directly using
  // the key from .env.local, which vite only injects in development mode.
  if (!process.env.API_KEY) {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Error de la API (${res.status}).`);
    }
    return data.script || 'Error al generar el guion.';
  }

  try {
    // Dynamic import: the SDK only loads in local dev, never in the prod bundle
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = buildScriptPrompt(params);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Error al generar el guion.';
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    throw error;
  }
};
