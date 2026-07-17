interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const ONE_MINUTE = 60_000;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  auth: { windowMs: ONE_MINUTE, maxRequests: 10 },
  generate: { windowMs: ONE_MINUTE, maxRequests: 15 },
  sync: { windowMs: ONE_MINUTE, maxRequests: 30 },
  scripts: { windowMs: ONE_MINUTE, maxRequests: 60 },
  settings: { windowMs: ONE_MINUTE, maxRequests: 30 },
  admin: { windowMs: ONE_MINUTE, maxRequests: 30 },
};

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

export function getRateLimitConfig(path: string): RateLimitConfig {
  if (path.includes('/auth')) return DEFAULTS.auth;
  if (path.includes('/generate')) return DEFAULTS.generate;
  if (path.includes('/sync')) return DEFAULTS.sync;
  if (path.includes('/scripts')) return DEFAULTS.scripts;
  if (path.includes('/settings')) return DEFAULTS.settings;
  if (path.includes('/admin')) return DEFAULTS.admin;
  return { windowMs: ONE_MINUTE, maxRequests: 60 };
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: entry.resetAt };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function applyRateLimit(req: any, res: any): boolean {
  const ip = getClientIp(req);
  const path = req.url || '';
  const config = getRateLimitConfig(path);
  const key = `${ip}:${path.split('?')[0]}`;
  const result = checkRateLimit(key, config);

  res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    res.status(429).json({
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    });
    return false;
  }
  return true;
}

// Periodically sweep stale entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, ONE_MINUTE * 5);
}
