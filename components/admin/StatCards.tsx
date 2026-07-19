import React from 'react';
import { Users, FileText, Crown, Activity } from 'lucide-react';

interface StatCardsProps {
  totalUsers: number;
  activeUsers: number;
  totalScripts: number;
  proUsers: number;
}

const cardsConfig = [
  { label: 'Usuarios Totales', key: 'totalUsers' as const, icon: <Users className="w-8 h-8" />, color: 'from-upf-cyan/80 to-upf-cyan/30' },
  { label: 'Usuarios Activos', key: 'activeUsers' as const, icon: <Activity className="w-8 h-8" />, color: 'from-upf-cyan/80 to-upf-cyan/30' },
  { label: 'Guiones Creados', key: 'totalScripts' as const, icon: <FileText className="w-8 h-8" />, color: 'from-upf-cyan/60 to-upf-cyan/20' },
  { label: 'Usuarios Pro', key: 'proUsers' as const, icon: <Crown className="w-8 h-8" />, color: 'from-upf-cyan to-upf-cyan/50' },
];

export const StatCards: React.FC<StatCardsProps> = ({ totalUsers, activeUsers, totalScripts, proUsers }) => {
  const values = { totalUsers, activeUsers, totalScripts, proUsers };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardsConfig.map(card => (
        <div key={card.key} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 text-white`}>
            {card.icon}
          </div>
          <div className="text-3xl font-bold text-white">{values[card.key]}</div>
          <div className="text-sm text-slate-400 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
};
