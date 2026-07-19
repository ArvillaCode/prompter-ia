import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, AdminUser } from '../../services/adminApi';
import { Button } from '../Button';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Shield, Crown, User, Save, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: caller } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [licenseCode, setLicenseCode] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isSuperadmin = caller?.role === 'superadmin';

  const loadUser = () => {
    if (!id) return;
    adminApi.getUser(id)
      .then(data => {
        setUser(data.user);
        setRole(data.user.role);
        setPlan(data.user.plan);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadUser(); }, [id]);

  const handleAssignLicense = async () => {
    if (!id || !licenseCode.trim()) return;
    setAssigning(true);
    setFeedback(null);
    try {
      await adminApi.assignLicense(id, licenseCode.trim().toUpperCase());
      setLicenseCode('');
      loadUser();
      setFeedback({ type: 'success', msg: 'Licencia asignada correctamente.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setAssigning(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (role !== user?.role) await adminApi.updateRole(id, role);
      if (plan !== user?.plan) await adminApi.updatePlan(id, plan);
      navigate('/admin/users');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-upf-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-upf-cyan text-center py-12">Error: {error || 'Usuario no encontrado'}</div>;
  }

  return (
    <div className="w-full min-w-0 max-w-2xl">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Usuarios
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
          <div className="w-14 h-14 shrink-0 rounded-full bg-upf-cyan flex items-center justify-center text-upf-black text-xl font-bold shadow-lg shadow-upf-cyan/30">
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white">{user.displayName || 'Sin nombre'}</h2>
            <p className="text-slate-400 break-all">{user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Registrado el {new Date(user.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rol</label>
            <div className="flex flex-wrap gap-2">
              {['user', 'admin', 'superadmin'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    role === r
                      ? 'bg-upf-cyan/20 text-upf-cyan border-upf-cyan/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {r === 'superadmin' ? <Crown className="w-4 h-4" /> : r === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Plan</label>
            <div className="flex flex-wrap gap-2">
              {['free', 'pro', 'team'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    plan === p
                      ? 'bg-upf-cyan/20 text-upf-cyan border-upf-cyan/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-500">Estado</span>
              <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                user.isActive ? 'bg-upf-cyan/20 text-upf-cyan' : 'bg-upf-slate/20 text-upf-slate'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-upf-cyan' : 'bg-upf-slate'}`} />
                {user.isActive ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Estado del Plan</span>
              <div className="mt-1 text-sm text-slate-300 capitalize">{user.planStatus}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Generaciones IA usadas</span>
              <div className="mt-1 text-sm text-slate-300">{user.aiGenerationsUsed}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Licencia</span>
              <div className="mt-1 text-sm">
                {user.licenseExpiresAt ? (
                  user.licenseExpiresAt > Date.now() ? (
                    <span className="text-upf-cyan">
                      Vigente hasta el {new Date(user.licenseExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-upf-slate">
                      Venció el {new Date(user.licenseExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )
                ) : (
                  <span className="text-upf-slate">Sin licencia</span>
                )}
              </div>
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              feedback.type === 'success'
                ? 'bg-upf-cyan/10 text-upf-cyan border border-upf-cyan/30'
                : 'bg-upf-cyan/10 text-upf-cyan border border-upf-cyan/30'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {feedback.msg}
            </div>
          )}

          {isSuperadmin && user.role === 'user' && (
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Asignar licencia {user.licenseExpiresAt ? '(reemplaza la vigencia actual)' : ''}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={e => setLicenseCode(e.target.value.toUpperCase())}
                    placeholder="PP-XXXX-XXXX-XXXX (licencia disponible)"
                    spellCheck={false}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white font-mono placeholder-slate-600 outline-none focus:ring-2 focus:ring-upf-cyan/50"
                  />
                </div>
                <Button variant="secondary" onClick={handleAssignLicense} isLoading={assigning} className="w-full sm:w-auto">
                  Asignar
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                La vigencia empieza a contar desde hoy. Genera licencias en la pestaña Licencias.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
            <Button onClick={handleSave} isLoading={saving} icon={<Save className="w-4 h-4" />} className="w-full sm:w-auto">
              Guardar Cambios
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/users')} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
