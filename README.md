# ProPrompter AI

Teleprónter web con generación de guiones por IA (Gemini). Incluye biblioteca de guiones, grabación de video con countdown, espejo para beam-splitter, selectores de micrófono/cámara, atajos de teclado (compatibles con controles remotos Bluetooth) y soporte móvil.

## Licencias

El registro y el inicio de sesión requieren una licencia vigente:

- El **superadmin** genera licencias desde el panel (`/admin` → Licencias) con vigencia de 1 mes, 3 meses o 1 año.
- La vigencia empieza a contar cuando el usuario **usa** el código al registrarse, no al generarlo.
- Un usuario con licencia vencida no puede iniciar sesión y sus sesiones abiertas se invalidan; el superadmin puede renovarlo asignándole una licencia nueva desde el detalle del usuario.
- Los roles `admin` y `superadmin` no requieren licencia.

## API key de Gemini por usuario

Cada usuario puede configurar su propia API key (botón "API Key" en el editor). Con key propia, las generaciones con IA no consumen la cuota del plan. Las keys se guardan cifradas con AES-256-GCM y nunca se devuelven completas al navegador.

Variables de entorno del servidor:

| Variable | Requerida | Uso |
|---|---|---|
| `TURSO_DATABASE_URL` | Sí | Base de datos (`file:/app/data/local.db` o URL de Turso) |
| `JWT_SECRET` | Sí | Firma de sesiones y (fallback) derivación de la clave de cifrado de API keys |
| `GEMINI_API_KEY` | No | Key del servidor para usuarios sin key propia |
| `API_KEY_ENCRYPTION_SECRET` | No | Secreto dedicado para cifrar API keys (si no, se deriva de `JWT_SECRET`; rotarlo invalida las keys guardadas) |
| `TURSO_AUTH_TOKEN` | No | Solo con Turso remoto |

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
