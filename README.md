# ProPrompter AI

Teleprónter web con generación de guiones por IA (Gemini). Incluye biblioteca de guiones, grabación de video con countdown, espejo para beam-splitter, selectores de micrófono/cámara, atajos de teclado (compatibles con controles remotos Bluetooth) y soporte móvil.

## Desarrollo local

**Prerrequisitos:** Node.js

1. Instalar dependencias:
   `npm install`
2. Poner tu key de Gemini en `.env.local`:
   `GEMINI_API_KEY=tu_key`
3. Correr la app:
   `npm run dev`

En desarrollo la app llama a Gemini directamente con la key de `.env.local`.

## Despliegue (Vercel)

En producción la key **no** viaja al navegador: la llamada a Gemini pasa por la función serverless [api/generate.ts](api/generate.ts).

1. Conectar el repo a Vercel (framework: Vite).
2. En **Settings → Environment Variables** agregar `GEMINI_API_KEY` con tu key.
3. Desplegar. La función queda disponible en `/api/generate`.

## Atajos de teclado (vista teleprónter)

| Tecla | Acción |
|---|---|
| Espacio / Av Pág | Play / Pausa |
| Re Pág | Reiniciar al inicio |
| ↑ / ↓ | Velocidad ±5 |
| ← / → | Tamaño de letra ±4px |
| Esc | Volver al editor |

Los controles remotos Bluetooth de presentación funcionan: el sistema los ve como teclado (Av Pág / Re Pág).
