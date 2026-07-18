import type { AuthUser, PrompterSettings, SavedScript } from '../types';

const TOKEN_KEY = 'proprompter-auth-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'Sesión expirada. Inicia sesión de nuevo.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error desconocido.' }));
    throw new ApiError(res.status, data.error || 'Error desconocido.');
  }

  return res.json() as Promise<T>;
}

// --- Auth ---
interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string, licenseCode: string, displayName?: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, licenseCode, displayName }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<{ user: AuthUser }>('/api/auth/me'),
};

// --- Scripts ---
export const scriptsApi = {
  list: () => apiFetch<{ scripts: SavedScript[] }>('/api/scripts'),
};

// --- Settings ---
export const settingsApi = {
  get: () => apiFetch<{ settings: PrompterSettings | null }>('/api/settings'),
};

// --- API key de Gemini del usuario ---
export interface ApiKeyStatus {
  hasKey: boolean;
  last4: string | null;
  invalid?: boolean;
}

export const apiKeyApi = {
  get: () => apiFetch<ApiKeyStatus>('/api/settings/apikey'),
  save: (apiKey: string) =>
    apiFetch<ApiKeyStatus>('/api/settings/apikey', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    }),
  remove: () => apiFetch<ApiKeyStatus>('/api/settings/apikey', { method: 'DELETE' }),
};

// --- Sync ---
export interface SyncResponse {
  scripts: SavedScript[];
  settings: PrompterSettings | null;
  syncTimestamp: number;
}

export const syncApi = {
  sync: (data: { scripts: SavedScript[]; settings: PrompterSettings; lastSyncAt: number | null }) =>
    apiFetch<SyncResponse>('/api/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
