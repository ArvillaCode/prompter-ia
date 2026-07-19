import React from 'react';
import { UserPlus, KeyRound, Clock } from 'lucide-react';

interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  createdAt: number;
}

interface LicenseSummary {
  id: string;
  code: string;
  durationDays: number;
  status: string;
  createdAt: number;
}

interface RecentActivityProps {
  users: UserSummary[];
  licenses: LicenseSummary[];
}

function timeAgo(epochMs: number): string {
  const seconds = Math.floor((Date.now() - epochMs) / 1000);
  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(epochMs).toLocaleDateString('es-CO');
}

const DURATION_LABELS: Record<number, string> = { 30: '1 mes', 90: '3 meses', 365: '1 año' };

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  used: 'Activa',
  expired: 'Vencida',
  revoked: 'Revocada',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-upf-cyan/20 text-upf-cyan',
  used: 'bg-upf-cyan/15 text-upf-cyan',
  expired: 'bg-upf-slate/20 text-upf-slate',
  revoked: 'bg-upf-slate/15 text-upf-slate',
};

const STATUS_HEX: Record<string, string> = {
  available: '#00E5FF',
  used: '#00E5FF',
  expired: '#94A3B8',
  revoked: '#64748B',
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ users, licenses }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Actividad Reciente</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Últimos usuarios */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            Últimos Usuarios
          </h4>
          {users.length === 0 ? (
            <p className="text-xs text-slate-600">Sin usuarios</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-upf-cyan/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-upf-cyan">
                      {(u.displayName || u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{u.displayName || u.email}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                      u.plan === 'pro' || u.plan === 'team'
                        ? 'bg-upf-cyan/20 text-upf-cyan'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {u.plan}
                    </span>
                    <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(u.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas licencias */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Últimas Licencias
          </h4>
          {licenses.length === 0 ? (
            <p className="text-xs text-slate-600">Sin licencias</p>
          ) : (
            <div className="space-y-2">
              {licenses.map(l => (
                <div key={l.id} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${STATUS_HEX[l.status] || '#64748B'}20` }}
                  >
                    <KeyRound className="w-3.5 h-3.5" style={{ color: STATUS_HEX[l.status] || '#64748B' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-mono text-xs truncate">{l.code}</p>
                    <p className="text-xs text-slate-500">{DURATION_LABELS[l.durationDays] || `${l.durationDays} días`}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[l.status] || 'bg-slate-700/50 text-slate-400'}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                    <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(l.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
