# ProPrompter AI — Agent instructions

## Dev commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite frontend only (port 3000) |
| `npm run dev:server` | Express backend (port 3001, tsx watch) |
| `npm run dev:all` | Both concurrently |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply DB migrations (must run before server) |
| `npm run build` | Vite production build |
| `npm run start` / `npm run preview` | Express serving the built frontend |

No test, lint, or formatter configs exist.

## Architecture

**Dual-process dev**: Vite on `127.0.0.1:3000` proxies `/api` → Express on `localhost:3001`. Both must be running for full functionality.

**Two backend modes** (shared code, different entrypoints):
- **Express server** (`server/index.ts`, via `tsx`) — used for Docker/self-hosted
- **Vercel serverless** (`api/generate.ts`) — only the generate endpoint lives here

**Two DB clients**: `api/db/client.ts` (Vercel functions) and `server/db/client.ts` (Express). Both connect via `@libsql/client` to the same `TURSO_DATABASE_URL`.

**Auth flow**: JWT (jose, 7-day expiry) stored in `localStorage` as `proprompter-auth-token`. Registration requires a valid license code. All authenticated requests check license expiry in `requireAuth` middleware.

**Guest mode**: Unauthenticated users can use the editor with localStorage persistence. Once they log in, local data is migrated to the cloud on first sync.

**Script generation**: Two Gemini API paths:
- Dev: `process.env.API_KEY` injected by Vite's `define` → `@google/genai` SDK directly in the browser
- Prod: the Express server holds `GEMINI_API_KEY`, calls Gemini server-side
- Users can set their own API key (encrypted with AES-256-GCM in the DB)

## Code conventions

**Path alias**: `@/*` → project root (defined in `tsconfig.json` and `vite.config.ts`).

**Brand palette** (enforced via Tailwind config — do not use Tailwind native colors for accents):
- `upf-black` (#080C14) — page/background
- `upf-cyan` (#00E5FF) — only accent (CTAs, highlights, active states)
- `upf-white` (#FFFFFF) — primary text
- `upf-slate` (#94A3B8) — secondary text, subtle borders

**CSP**: Very restrictive (`index.html`). No inline scripts, no external connects besides self. Be careful when adding new resources.

**No ESLint/Prettier**: Code has inline disables (`// eslint-disable-next-line`). Match existing style.

## Important gotchas

- Migration (`npm run db:migrate`) manually loads `.env.local` because tsx doesn't auto-load it. The Express server loads it via `dotenv` at its entrypoint.
- `tsconfig.server.json` extends `tsconfig.json` with `noEmit: false` for the server build. The main `tsconfig.json` has `noEmit: true` (Vite handles frontend bundling).
- `trust proxy` is set to `1` in Express (`server/index.ts:21`) — needed when behind a reverse proxy so rate limiting sees the real client IP.
- The Dockerfile runs migration then server in a single `CMD` — if migration fails, the server still starts.
- `Gemini API key` encryption uses `API_KEY_ENCRYPTION_SECRET` (or falls back to `JWT_SECRET`). Rotating either invalidates stored user keys.
- Bluetooth presenter remotes work as keyboard input (PageUp/PageDown) in the prompter view.
