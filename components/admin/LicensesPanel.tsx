import React, { useEffect, useState } from 'react';
import { adminApi, AdminLicense } from '../../services/adminApi';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../Button';
import { KeyRound, Copy, Check, Ban, Search, Clock } from 'lucide-react';

const DURATION_LABELS: Record<number, string> = { 30: '1 mes', 90: '3 meses', 365: '1 año' };

function durationLabel(days: number): string {
  return DURATION_LABELS[days] || `${days} días`;
}

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

type DerivedStatus = 'disponible' | 'activa' | 'vencida' | 'revocada';

function deriveStatus(l: AdminLicense): DerivedStatus {
  if (l.status === 'revoked') return 'revocada';
  if (l.status === 'available') return 'disponible';
  if (l.expiresAt && l.expiresAt < Date.now()) return 'vencida';
  return 'activa';
}

const STATUS_STYLES: Record<DerivedStatus, string> = {
  disponible: 'bg-cyan-600/20 text-cyan-300',
  activa: 'bg-emerald-600/20 text-emerald-400',
  vencida: 'bg-amber-600/20 text-amber-400',
  revocada: 'bg-red-600/20 text-red-400',
};

function daysRemaining(l: AdminLicense): string {
  if (l.status !== 'used' || !l.expiresAt) return '—';
  const diff = l.expiresAt - Date.now();
  if (diff <= 0) return 'Vencida';
  const days = Math.ceil(diff / 86_400_000);
  return `${days} día${days === 1 ? '' : 's'}`;
}

export const LicensesPanel: React.FC = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const [lastCreated, setLastCreated] = useState<AdminLicense | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isSuperadmin = user?.role === 'superadmin';

  const load = () => {
    adminApi.listLicenses()
      .then(data => { setLicenses(data.licenses); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (durationDays: number) => {
    setCreating(durationDays);
    setError(null);
    try {
      const data = await adminApi.createLicense(durationDays);
      setLastCreated(data.license);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(null);
    }
  };

  const handleCopy = async (license: AdminLicense) => {
    try {
      await navigator.clipboard.writeText(license.code);
      setCopiedId(license.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard no disponible
    }
  };

  const handleRevoke = async (license: AdminLicense) => {
    const inUse = license.status === 'used' && license.usedByEmail;
    const msg = inUse
      ? `¿Revocar la licencia ${license.code}? El usuario ${license.usedByEmail} perderá el acceso de inmediato.`
      : `¿Revocar la licencia ${license.code}? Ya no podrá usarse para registrarse.`;
    if (!window.confirm(msg)) return;
    try {
      await adminApi.revokeLicense(license.id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = licenses.filter(l =>
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    (l.usedByEmail?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const counts = {
    disponibles: licenses.filter(l => deriveStatus(l) === 'disponible').length,
    activas: licenses.filter(l => deriveStatus(l) === 'activa').length,
    vencidas: licenses.filter(l => deriveStatus(l) === 'vencida').length,
    revocadas: licenses.filter(l => deriveStatus(l) === 'revocada').length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Licencias</h2>
        {isSuperadmin && (
          <div className="flex flex-wrap gap-2">
            {[30, 90, 365].map(d => (
              <Button
                key={d}
                onClick={() => handleCreate(d)}
                isLoading={creating === d}
                disabled={creating !== null}
                icon={<KeyRound className="w-4 h-4" />}
                className="text-sm"
              >
                Generar {durationLabel(d)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {!isSuperadmin && (
        <p className="text-sm text-slate-500 mb-4">Solo el superadmin puede generar o revocar licencias.</p>
      )}

      {lastCreated && (
        <div className="mb-6 bg-emerald-600/10 border border-emerald-600/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-emerald-400 font-medium mb-1">
              Licencia de {durationLabel(lastCreated.durationDays)} generada — compártela con el usuario:
            </div>
            <code className="text-lg font-mono tracking-wider text-white">{lastCreated.code}</code>
            <p className="text-xs text-slate-500 mt-1">
              La vigencia empieza a contar cuando el usuario la use, no ahora.
            </p>
          </div>
          <Button variant="secondary" onClick={() => handleCopy(lastCreated)} icon={copiedId === lastCreated.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}>
            {copiedId === lastCreated.id ? 'Copiada' : 'Copiar'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        {([
          ['Disponibles', counts.disponibles, 'text-cyan-300'],
          ['Activas', counts.activas, 'text-emerald-400'],
          ['Vencidas', counts.vencidas, 'text-amber-400'],
          ['Revocadas', counts.revocadas, 'text-red-400'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
            <span className={`text-lg font-bold ${color}`}>{value}</span>
            <span className="text-xs text-slate-500 ml-2">{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      <div className="relative w-full sm:w-72 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por código o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-upf-cyan/50"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-upf-cyan border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Código</th>
                  <th className="text-left px-4 py-3 font-medium">Duración</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Creada</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Inicio</th>
                  <th className="text-left px-4 py-3 font-medium">Vence</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Restante</th>
                  <th className="text-right px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const status = deriveStatus(l);
                  return (
                    <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCopy(l)}
                          className="flex items-center gap-2 font-mono text-white hover:text-upf-cyan transition-colors"
                          title="Copiar código"
                        >
                          {l.code}
                          {copiedId === l.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{durationLabel(l.durationDays)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{l.usedByEmail || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{formatDate(l.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{formatDate(l.activatedAt)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(l.expiresAt)}</td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1">
                          {l.status === 'used' && <Clock className="w-3.5 h-3.5" />}
                          {daysRemaining(l)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSuperadmin && l.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevoke(l)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Revocar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      {licenses.length === 0 ? 'Aún no hay licencias. Genera la primera con los botones de arriba.' : 'No se encontraron licencias'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
