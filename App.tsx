import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppMode, SavedScript } from './types';
import { PrompterView } from './components/PrompterView';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { ScriptLibraryModal } from './components/ScriptLibraryModal';
import { Button } from './components/Button';
import { LoginScreen } from './components/LoginScreen';
import { AdminLayout } from './components/admin/AdminLayout';
import { UsersList } from './components/admin/UsersList';
import { UserDetail } from './components/admin/UserDetail';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LicensesPanel } from './components/admin/LicensesPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LogOut, Play, Sparkles, Mic, FileText, Type, Shield, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';

function EditorPage() {
  const { user, logout } = useAuth();
  const { scripts, activeId, settings, setScripts, setActiveId, setSettings, isDataLoading, dataError, reloadData } = useData();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

  const activeScript = scripts.find(s => s.id === activeId) ?? scripts[0];
  const script = activeScript?.content ?? '';

  const updateActive = (patch: Partial<Pick<SavedScript, 'title' | 'content'>>) => {
    if (!activeScript) return;
    setScripts(prev => prev.map(s => (s.id === activeScript.id ? { ...s, ...patch, updatedAt: Date.now() } : s)));
  };

  const handleNewScript = () => {
    const fresh: SavedScript = {
      id: crypto.randomUUID(),
      title: 'Guion sin título',
      content: '',
      updatedAt: Date.now(),
    };
    setScripts(prev => [...prev, fresh]);
    setActiveId(fresh.id);
    setIsLibraryOpen(false);
  };

  const handleDuplicateScript = (id: string) => {
    const source = scripts.find(s => s.id === id);
    if (!source) return;
    const copy: SavedScript = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} (copia)`,
      updatedAt: Date.now(),
    };
    setScripts(prev => [...prev, copy]);
  };

  const handleDeleteScript = (id: string) => {
    setScripts(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const fresh: SavedScript = {
          id: crypto.randomUUID(),
          title: 'Guion sin título',
          content: '',
          updatedAt: Date.now(),
        };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        const mostRecent = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveId(mostRecent.id);
      }
      return remaining;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === AppMode.PROMPTER) {
        setMode(AppMode.EDITOR);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  if (mode === AppMode.PROMPTER) {
    return (
      <PrompterView
        script={script}
        settings={settings}
        updateSettings={setSettings}
        onExit={() => setMode(AppMode.EDITOR)}
      />
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Show loading spinner while data is being fetched
  if (isDataLoading) {
    return (
      <div className="min-h-screen-dvh bg-upf-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-upf-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show error with reload button if hydration failed
  if (dataError) {
    return (
      <div className="min-h-screen-dvh bg-upf-black flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-10 h-10 text-upf-cyan" />
        <p className="text-upf-slate text-center max-w-md">{dataError}</p>
        <button
          onClick={reloadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-upf-cyan text-upf-black font-medium hover:bg-upf-cyan/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen-dvh bg-upf-black text-slate-200 flex flex-col">
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onScriptGenerated={(newScript) => updateActive({ content: newScript })}
      />
      <ApiKeyModal isOpen={isApiKeyOpen} onClose={() => setIsApiKeyOpen(false)} />
      <ScriptLibraryModal
        isOpen={isLibraryOpen}
        scripts={scripts}
        activeId={activeId}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={setActiveId}
        onNew={handleNewScript}
        onDuplicate={handleDuplicateScript}
        onDelete={handleDeleteScript}
      />

      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand/upfunnel-logo-horizontal.png"
              alt="Upfunnel"
              className="h-7 sm:h-8"
            />
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ProPrompter AI
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden sm:block text-sm text-slate-400">{user?.email}</span>
            <Button
              variant="ghost"
              onClick={() => setIsApiKeyOpen(true)}
              icon={<KeyRound className="w-4 h-4" />}
              title="Mi API Key de Gemini"
              className="px-2.5 sm:px-4"
            >
              <span className="hidden sm:inline">API Key</span>
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                onClick={() => navigate('/admin')}
                icon={<Shield className="w-4 h-4" />}
                title="Panel de administración"
                className="px-2.5 sm:px-4"
              >
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={logout}
              icon={<LogOut className="w-4 h-4" />}
              title="Cerrar sesión"
              className="px-2.5 sm:px-4"
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 bg-grid">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
          <input
            value={activeScript?.title ?? ''}
            onChange={(e) => updateActive({ title: e.target.value })}
            placeholder="Título del guion..."
            className="flex-1 min-w-[180px] bg-transparent text-base font-semibold text-white placeholder-slate-600 outline-none border-b border-transparent focus:border-upf-cyan/50 transition-colors pb-0.5"
          />
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{script.trim() === '' ? 0 : script.trim().split(/\s+/).length} palabras</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span>{Math.ceil((script.trim() === '' ? 0 : script.trim().split(/\s+/).length) / 130)} min lectura</span>
            </div>
          </div>

          <div className="flex gap-2 sm:hidden">
            <Button variant="secondary" onClick={() => setIsLibraryOpen(true)} className="text-sm">Biblioteca</Button>
            <Button variant="secondary" onClick={() => setIsAIModalOpen(true)} className="text-sm">IA</Button>
          </div>
        </div>

        <div className="flex-1 relative group">
          <textarea
            value={script}
            onChange={(e) => updateActive({ content: e.target.value })}
            placeholder="Escribe tu guion aquí, o usa la IA para generar uno..."
            className="w-full h-full min-h-[500px] bg-upf-black/50 border border-slate-800 rounded-2xl p-8 text-lg leading-relaxed text-slate-100 focus:ring-2 focus:ring-upf-cyan/50 focus:border-upf-cyan transition-all outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => setIsLibraryOpen(true)}
            icon={<FileText className="w-4 h-4" />}
            className="hidden sm:flex"
          >
            Biblioteca
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsAIModalOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-upf-cyan" />}
            className="hidden sm:flex"
          >
            Generar con IA
          </Button>
          <Button
            onClick={() => setMode(AppMode.PROMPTER)}
            icon={<Play className="w-4 h-4 fill-current" />}
            className="shadow-lg shadow-upf-cyan/30 ring-1 ring-upf-cyan/20 hover:ring-upf-cyan/40"
          >
            Abrir Teleprónter
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isLoading) {
    return (
      <div className="min-h-screen-dvh bg-upf-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-upf-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAdminRoute) {
    if (!user) return <LoginScreen />;
    return (
      <AdminLayout>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersList />} />
          <Route path="/admin/users/:id" element={<UserDetail />} />
          <Route path="/admin/licenses" element={<LicensesPanel />} />
        </Routes>
      </AdminLayout>
    );
  }

  if (!user) return <LoginScreen />;

  return <EditorPage />;
}
