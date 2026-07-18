const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_UPPER = /[A-Z]/;
const PASSWORD_LOWER = /[a-z]/;
const PASSWORD_DIGIT = /[0-9]/;
const PASSWORD_SPECIAL = /[^A-Za-z0-9]/;
const MAX_DISPLAY_NAME_LENGTH = 100;
const DISPLAY_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
const MAX_SCRIPT_CONTENT = 100_000;
const MAX_SCRIPT_TITLE = 200;

const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'abc12345', 'password1', 'password123', 'admin123', 'letmein',
  'welcome1', 'monkey123', 'iloveyou', 'sunshine', 'princess',
]);

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
  if (!PASSWORD_UPPER.test(password)) {
    return 'La contraseña debe contener al menos una mayúscula.';
  }
  if (!PASSWORD_LOWER.test(password)) {
    return 'La contraseña debe contener al menos una minúscula.';
  }
  if (!PASSWORD_DIGIT.test(password)) {
    return 'La contraseña debe contener al menos un número.';
  }
  if (!PASSWORD_SPECIAL.test(password)) {
    return 'La contraseña debe contener al menos un carácter especial.';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'La contraseña es demasiado común. Elige una más segura.';
  }
  return null;
}

export function validateDisplayName(name: unknown): string | null {
  if (name === undefined || name === null) return null;
  if (typeof name !== 'string') return 'El nombre no es válido.';
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return `El nombre es demasiado largo (máx ${MAX_DISPLAY_NAME_LENGTH} caracteres).`;
  }
  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return 'El nombre solo puede contener letras, espacios, guiones y apóstrofes.';
  }
  return null;
}

export function sanitizeDisplayName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  return trimmed || null;
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

const LICENSE_CODE_REGEX = /^PP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export function normalizeLicenseCode(code: unknown): string {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

export function validateLicenseCode(code: unknown): string | null {
  const normalized = normalizeLicenseCode(code);
  if (!normalized) return 'El código de licencia es requerido.';
  if (!LICENSE_CODE_REGEX.test(normalized)) {
    return 'El código de licencia no tiene un formato válido (PP-XXXX-XXXX-XXXX).';
  }
  return null;
}

const API_KEY_REGEX = /^[A-Za-z0-9_-]{20,200}$/;

export function validateGeminiApiKey(apiKey: unknown): string | null {
  if (typeof apiKey !== 'string') return 'La API key es requerida.';
  const trimmed = apiKey.trim();
  if (!trimmed) return 'La API key es requerida.';
  if (!API_KEY_REGEX.test(trimmed)) {
    return 'La API key no tiene un formato válido (sin espacios, 20-200 caracteres alfanuméricos).';
  }
  return null;
}
