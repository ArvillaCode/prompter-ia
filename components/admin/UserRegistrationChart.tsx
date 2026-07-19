import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { BucketCount, DateRange } from '../../services/adminApi';

interface UserRegistrationChartProps {
  data: BucketCount[];
  range: DateRange;
}

function formatBucket(bucket: string, range: DateRange): string {
  if (range === 'day') {
    // bucket = "2026-07-19 14:00" → "14:00"
    return bucket.slice(11, 16);
  }
  if (range === 'week' || range === 'month') {
    // bucket = "2026-07-19" → "19/07"
    const parts = bucket.split('-');
    return `${parts[2]}/${parts[1]}`;
  }
  // range === 'year': bucket = "2026-07" → "Jul 2026"
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [y, m] = bucket.split('-');
  return `${months[parseInt(m) - 1]} ${y}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">
        {payload[0].value} registro{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

export const UserRegistrationChart: React.FC<UserRegistrationChartProps> = ({ data, range }) => {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Registros de Usuarios</h3>
        <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
          Sin datos en este período
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({ ...d, label: formatBucket(d.bucket, range) }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Registros de Usuarios</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis
            dataKey="label"
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#00E5FF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
