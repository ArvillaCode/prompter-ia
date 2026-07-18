import React, { useEffect, useState } from 'react';
import { adminApi, AdminStats } from '../../services/adminApi';
import { Users, FileText, Crown, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="text-red-400 text-center py-12">
        Error al cargar estadísticas: {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Usuarios Totales', value: stats.totalUsers, icon: <Users className="w-8 h-8" />, color: 'from-blue-500 to-blue-700' },
    { label: 'Usuarios Activos', value: stats.activeUsers, icon: <Activity className="w-8 h-8" />, color: 'from-emerald-500 to-emerald-700' },
    { label: 'Guiones Creados', value: stats.totalScripts, icon: <FileText className="w-8 h-8" />, color: 'from-purple-500 to-purple-700' },
    { label: 'Usuarios Pro', value: stats.proUsers, icon: <Crown className="w-8 h-8" />, color: 'from-amber-500 to-orange-700' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 text-white`}>
              {card.icon}
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="text-sm text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
