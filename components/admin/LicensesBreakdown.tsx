import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DurationCount } from '../../services/adminApi';

interface LicensesBreakdownProps {
  data: DurationCount[];
}

const LABELS: Record<number, string> = { 30: '1 mes', 90: '3 meses', 365: '1 año' };
const COLORS = ['#00E5FF', '#06B6D4', '#0891B2'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = payload[0].payload.total;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{d.label}</p>
      <p className="text-sm font-bold text-white">{d.count} ({Math.round((d.count / total) * 100)}%)</p>
    </div>
  );
};

export const LicensesBreakdown: React.FC<LicensesBreakdownProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Licencias por Duración</h3>
        <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
          Sin licencias
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map(d => ({ ...d, label: LABELS[d.durationDays] || `${d.durationDays} días` }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Licencias por Duración</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-slate-500 mt-2">
        Total: <span className="text-white font-medium">{total}</span> licencia{total !== 1 ? 's' : ''}
      </p>
    </div>
  );
};
