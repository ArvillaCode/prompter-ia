import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import express from 'express';
import { readFileSync } from 'fs';
import { createServer } from 'http';

import authRoutes from './routes/auth';
import scriptsRoutes from './routes/scripts';
import settingsRoutes from './routes/settings';
import syncRoutes from './routes/sync';
import generateRoutes from './routes/generate';
import adminRoutes from './routes/admin';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Detrás de un único reverse proxy (Traefik/Coolify). Necesario para que
// req.ip resuelva la IP real del cliente en vez de la del proxy, y para
// que el rate limiter no sea trivial de burlar falsificando X-Forwarded-For.
app.set('trust proxy', 1);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve Vite-built static frontend in production
const distPath = resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  const indexPath = resolve(distPath, 'index.html');
  try {
    const html = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch {
    res.status(404).json({ error: 'Frontend not built. Run npm run build first.' });
  }
});

const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
