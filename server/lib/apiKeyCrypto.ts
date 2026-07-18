import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

// Cifrado en reposo de las API keys de los usuarios (AES-256-GCM).
// La clave de cifrado se deriva de API_KEY_ENCRYPTION_SECRET (o JWT_SECRET
// como respaldo) — si rotas ese secreto, las keys guardadas dejan de poder
// descifrarse y cada usuario deberá volver a configurar la suya.

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET or JWT_SECRET must be set to store API keys');
  }
  cachedKey = scryptSync(secret, 'proprompter-apikey-salt-v1', 32);
  return cachedKey;
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptApiKey(stored: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = stored.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
