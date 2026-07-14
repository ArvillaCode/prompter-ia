export const generateScript = async (topic: string, tone: string, audience: string): Promise<string> => {
  // In production the key never reaches the browser: the Vercel function
  // /api/generate holds it. Local dev (vite) calls Gemini directly using
  // the key from .env.local, which vite only injects in development mode.
  if (!process.env.API_KEY) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, tone, audience }),
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }
    const data = await res.json();
    return data.script || "Error al generar el guion.";
  }

  try {
    // Dynamic import: the SDK only loads in local dev, never in the prod bundle
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    return response.text || "Error al generar el guion.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
