import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { StatusCount } from '../../services/adminApi';

interface LicensesStatusChartProps {
  data: StatusCount[];
}

const LABELS: Record<string, string> = {
  available: 'Disponibles',
  active: 'Activas',
  expired: 'Vencidas',
  revoked: 'Revocadas',
};

const COLORS: Record<string, string> = {
  available: '#00E5FF',
  active: '#06B6D4',
  expired: '#94A3B8',
  revoked: '#64748B',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-bold text-white">{payload[0].payload.label}: {payload[0].value}</p>
    </div>
  );
};

export const LicensesStatusChart: React.FC<LicensesStatusChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Estado de Licencias</h3>
        <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
          Sin licencias
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({ ...d, label: LABELS[d.status] || d.status }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Estado de Licencias</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" horizontal={false} />
          <XAxis
            type="number"
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#94A3B8"
            tick={{ fontSize: 12, fill: '#94A3B8' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <rect key={i} fill={COLORS[entry.status] || '#94A3B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
