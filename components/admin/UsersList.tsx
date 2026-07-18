import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, AdminUser } from '../../services/adminApi';
import { Button } from '../Button';
import { Search, ChevronDown, ChevronUp, Shield, User, Crown } from 'lucide-react';

const ROLE_BADGES: Record<string, { color: string; icon: React.ReactNode }> = {
  superadmin: { color: 'bg-red-600/20 text-red-400 border-red-600/50', icon: <Crown className="w-3 h-3" /> },
  admin: { color: 'bg-amber-600/20 text-amber-400 border-amber-600/50', icon: <Shield className="w-3 h-3" /> },
  user: { color: 'bg-slate-700/50 text-slate-300 border-slate-600', icon: <User className="w-3 h-3" /> },
};

export const UsersList: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();

  const loadUsers = () => {
    setLoading(true);
    adminApi.listUsers()
      .then(data => { setUsers(data.users); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users
    .filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);

  const handleToggleActive = async (id: string) => {
    try {
      await adminApi.toggleActive(id);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error) {
    return <div className="text-red-400 text-center py-12">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Licencia</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-white">
                      Registro {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const badge = ROLE_BADGES[u.role] || ROLE_BADGES.user;
                  return (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white">{u.email}</td>
                      <td className="px-4 py-3 text-slate-300 hidden sm:table-cell">{u.displayName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                          {badge.icon}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.plan === 'pro' || u.plan === 'team'
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {u.role !== 'user' ? (
                          <span className="text-xs text-slate-500">N/A</span>
                        ) : u.licenseExpiresAt ? (
                          u.licenseExpiresAt > Date.now() ? (
                            <span className="text-xs text-emerald-400">
                              Vence {new Date(u.licenseExpiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-red-400">
                              Venció {new Date(u.licenseExpiresAt).toLocaleDateString()}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-amber-400">Sin licencia</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            className="text-xs px-2 py-1 h-7"
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                          >
                            Editar
                          </Button>
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              u.isActive
                                ? 'text-red-400 hover:bg-red-400/10'
                                : 'text-emerald-400 hover:bg-emerald-400/10'
                            }`}
                          >
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      No se encontraron usuarios
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
