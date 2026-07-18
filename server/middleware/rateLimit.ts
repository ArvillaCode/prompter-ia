import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const ONE_MINUTE = 60_000;

const DEFAULTS: Record<string, { windowMs: number; maxRequests: number }> = {
  auth: { windowMs: ONE_MINUTE, maxRequests: 10 },
  generate: { windowMs: ONE_MINUTE, maxRequests: 15 },
  sync: { windowMs: ONE_MINUTE, maxRequests: 30 },
  scripts: { windowMs: ONE_MINUTE, maxRequests: 60 },
  settings: { windowMs: ONE_MINUTE, maxRequests: 30 },
  admin: { windowMs: ONE_MINUTE, maxRequests: 30 },
};

function getConfig(path: string) {
  if (path.startsWith('/api/auth')) return DEFAULTS.auth;
  if (path.startsWith('/api/generate')) return DEFAULTS.generate;
  if (path.startsWith('/api/sync')) return DEFAULTS.sync;
  if (path.startsWith('/api/scripts')) return DEFAULTS.scripts;
  if (path.startsWith('/api/settings')) return DEFAULTS.settings;
  if (path.startsWith('/api/admin')) return DEFAULTS.admin;
  return { windowMs: ONE_MINUTE, maxRequests: 60 };
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const config = getConfig(req.path);
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());

  if (entry.count > config.maxRequests) {
    res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' });
    return;
  }

  next();
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, ONE_MINUTE * 5);
}
