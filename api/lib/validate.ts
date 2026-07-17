const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_SCRIPT_CONTENT = 100_000;
const MAX_SCRIPT_TITLE = 200;

export function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') return 'El correo es requerido.';
  const trimmed = email.trim();
  if (trimmed.length === 0) return 'El correo es requerido.';
  if (trimmed.length > MAX_EMAIL_LENGTH) return 'El correo es demasiado largo.';
  if (!EMAIL_REGEX.test(trimmed)) return 'El correo no es válido.';
  return null;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'La contraseña es requerida.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'La contraseña es demasiado larga.';
  }
  return null;
}

export function validateScriptTitle(title: unknown): string | null {
  if (typeof title !== 'string') return 'El título es requerido.';
  if (title.length > MAX_SCRIPT_TITLE) return 'El título es demasiado largo.';
  return null;
}

export function validateScriptContent(content: unknown): string | null {
  if (typeof content !== 'string') return 'El contenido es requerido.';
  if (content.length > MAX_SCRIPT_CONTENT) return 'El contenido es demasiado largo.';
  return null;
}

export function validateSettings(settings: unknown): string | null {
  if (typeof settings !== 'object' || settings === null) {
    return 'Configuración inválida.';
  }
  return null;
}
