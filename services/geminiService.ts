import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScript = async (topic: string, tone: string, audience: string): Promise<string> => {
  try {
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