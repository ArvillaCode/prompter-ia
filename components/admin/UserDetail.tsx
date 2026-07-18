import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, AdminUser } from '../../services/adminApi';
import { Button } from '../Button';
import { ArrowLeft, Shield, Crown, User, Save } from 'lucide-react';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.getUser(id)
      .then(data => {
        setUser(data.user);
        setRole(data.user.role);
        setPlan(data.user.plan);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      if (role !== user?.role) await adminApi.updateRole(id, role);
      if (plan !== user?.plan) await adminApi.updatePlan(id, plan);
      alert('Usuario actualizado correctamente');
      navigate('/admin/users');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-red-400 text-center py-12">Error: {error || 'Usuario no encontrado'}</div>;
  }

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Usuarios
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.displayName || 'Sin nombre'}</h2>
            <p className="text-slate-400">{user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Registrado el {new Date(user.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rol</label>
            <div className="flex gap-2">
              {['user', 'admin', 'superadmin'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    role === r
                      ? 'bg-amber-600/20 text-amber-400 border-amber-600/50'
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
            <div className="flex gap-2">
              {['free', 'pro', 'team'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    plan === p
                      ? 'bg-indigo-600/20 text-indigo-400 border-indigo-600/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-500">Estado</span>
              <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                user.isActive ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
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
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button onClick={handleSave} isLoading={saving} icon={<Save className="w-4 h-4" />}>
              Guardar Cambios
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/users')}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
