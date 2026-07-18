import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../Button';
import { Shield, Users, BarChart3, ArrowLeft, LogOut, KeyRound } from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/admin', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { path: '/admin/users', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
    { path: '/admin/licenses', label: 'Licencias', icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col bg-grid">
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-upf-cyan rounded-lg flex items-center justify-center shadow-lg shadow-upf-cyan/30">
              <Shield className="text-upf-black w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" onClick={() => navigate('/')} icon={<ArrowLeft className="w-4 h-4" />}>
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <Button variant="ghost" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                location.pathname === tab.path
                  ? 'border-upf-cyan text-upf-cyan'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};
