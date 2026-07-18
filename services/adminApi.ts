import type { AuthUser } from '../types';

const TOKEN_KEY = 'proprompter-auth-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(data.error || 'Error desconocido');
  }

  return res.json() as Promise<T>;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  plan: string;
  planStatus: string;
  aiGenerationsUsed: number;
  isActive: boolean;
  licenseExpiresAt: number | null;
  createdAt: number;
}

export interface AdminLicense {
  id: string;
  code: string;
  durationDays: number;
  status: 'available' | 'used' | 'revoked';
  createdAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  usedById: string | null;
  usedByEmail: string | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalScripts: number;
  proUsers: number;
}

export const adminApi = {
  listUsers: () => apiFetch<{ users: AdminUser[] }>('/api/admin/users'),
  getUser: (id: string) => apiFetch<{ user: AdminUser }>(`/api/admin/users/${id}`),
  updateRole: (id: string, role: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  updatePlan: (id: string, plan: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ plan }),
    }),
  toggleActive: (id: string) =>
    apiFetch<{ success: boolean; isActive: boolean }>(`/api/admin/users/${id}/toggle-active`, {
      method: 'PATCH',
    }),
  getStats: () => apiFetch<AdminStats>('/api/admin/stats'),
  listLicenses: () => apiFetch<{ licenses: AdminLicense[] }>('/api/admin/licenses'),
  createLicense: (durationDays: number) =>
    apiFetch<{ license: AdminLicense }>('/api/admin/licenses', {
      method: 'POST',
      body: JSON.stringify({ durationDays }),
    }),
  revokeLicense: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/licenses/${id}/revoke`, { method: 'PATCH' }),
  assignLicense: (userId: string, code: string) =>
    apiFetch<{ success: boolean; licenseExpiresAt: number }>(`/api/admin/users/${userId}/assign-license`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};
