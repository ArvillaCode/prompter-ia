import React, { useEffect, useState } from 'react';
import { adminApi, AdminDashboardData, DateRange } from '../../services/adminApi';
import { StatCards } from './StatCards';
import { DateRangeFilter } from './DateRangeFilter';
import { UserRegistrationChart } from './UserRegistrationChart';
import { LicensesBreakdown } from './LicensesBreakdown';
import { LicensesStatusChart } from './LicensesStatusChart';
import { RecentActivity } from './RecentActivity';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [range, setRange] = useState<DateRange>('week');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    adminApi.getDetailedStats(range)
      .then(setData)
      .catch(err => setError(err.message));
  }, [range]);

  if (error) {
    return (
      <div className="text-upf-cyan text-center py-12">
        Error al cargar estadísticas: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-upf-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <StatCards
        totalUsers={data.totalUsers}
        activeUsers={data.activeUsers}
        totalScripts={data.totalScripts}
        proUsers={data.proUsers}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <UserRegistrationChart data={data.userRegistrations} range={range} />
        <LicensesStatusChart data={data.licensesByStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <LicensesBreakdown data={data.licensesByDuration} />
        <RecentActivity users={data.latestUsers} licenses={data.latestLicenses} />
      </div>
    </div>
  );
};
