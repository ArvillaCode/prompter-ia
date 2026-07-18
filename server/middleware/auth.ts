import { Request, Response, NextFunction } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { getDbClient } from '../db/client';

const JWT_EXPIRY = '7d';
const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId === 'string' && typeof payload.email === 'string') {
      return { userId: payload.userId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
    return;
  }

  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT is_active, role, license_expires_at FROM users WHERE id = ?',
    args: [payload.userId],
  });
  const user = result.rows[0] as any;
  if (!user || user.is_active === 0) {
    res.status(401).json({ error: 'Esta cuenta fue desactivada.' });
    return;
  }

  const isPrivileged = user.role === 'admin' || user.role === 'superadmin';
  if (!isPrivileged) {
    const expiresAt = Number(user.license_expires_at) || 0;
    if (!expiresAt || expiresAt < Date.now()) {
      res.status(401).json({ error: 'Tu licencia ha expirado o no está activa. Contacta al administrador.' });
      return;
    }
  }

  req.userId = payload.userId;
  next();
}
