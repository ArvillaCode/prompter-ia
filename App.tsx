import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import { PrompterView } from './components/PrompterView';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { ScriptLibraryModal } from './components/ScriptLibraryModal';
import { Button } from './components/Button';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LogOut, Play, Sparkles, Mic, FileText, Type } from 'lucide-react';

const DEFAULT_SCRIPT = `Bienvenido a ProPrompter AI.

Este es un guion de demostración para mostrarte cómo funciona el teleprónter.

Puedes editar este texto en la vista del editor, o usar nuestras herramientas de IA para generar un guion por ti.

Haz clic en el botón "Play" para comenzar el desplazamiento.

Puedes ajustar la velocidad, el tamaño de la fuente y las opciones de espejo en el panel de control inferior.

¡Buena suerte con tu grabación!`;

export default function App() {
  const { user, logout } = useAuth();
  const { scripts, activeId, settings, setScripts, setActiveId, setSettings } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const activeScript = scripts.find(s => s.id === activeId) ?? scripts[0];
  const script = activeScript?.content ?? '';

  const updateActive = (patch: Partial<Pick<import('./types').SavedScript, 'title' | 'content'>>) => {
    if (!activeScript) return;
    setScripts(prev => prev.map(s => (s.id === activeScript.id ? { ...s, ...patch, updatedAt: Date.now() } : s)));
  };

  const handleNewScript = () => {
    const fresh: import('./types').SavedScript = {
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
    const copy: import('./types').SavedScript = {
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
        const fresh: import('./types').SavedScript = {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onScriptGenerated={(newScript) => updateActive({ content: newScript })}
      />
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

      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Mic className="text-white w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ProPrompter AI
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">{user?.email}</span>
            <Button
              variant="ghost"
              onClick={logout}
              icon={<LogOut className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">

        {/* Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
          <input
            value={activeScript?.title ?? ''}
            onChange={(e) => updateActive({ title: e.target.value })}
            placeholder="Título del guion..."
            className="flex-1 min-w-[180px] bg-transparent text-base font-semibold text-white placeholder-slate-600 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors pb-0.5"
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
            <Button
              variant="secondary"
              onClick={() => setIsLibraryOpen(true)}
              className="text-xs px-3 py-1 h-8"
            >
              Guiones
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsAIModalOpen(true)}
              className="text-xs px-3 py-1 h-8"
            >
              IA
            </Button>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 relative group">
          <textarea
            value={script}
            onChange={(e) => updateActive({ content: e.target.value })}
            placeholder="Escribe tu guion aquí, o usa la IA para generar uno..."
            className="w-full h-full min-h-[500px] bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-lg leading-relaxed text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => setIsLibraryOpen(true)}
            icon={<FileText className="w-4 h-4" />}
            className="hidden sm:flex"
          >
            Mis Guiones
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsAIModalOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            className="hidden sm:flex"
          >
            Escritor IA
          </Button>
          <Button
            onClick={() => setMode(AppMode.PROMPTER)}
            icon={<Play className="w-4 h-4 fill-current" />}
            className="shadow-lg shadow-indigo-500/20"
          >
            Iniciar Teleprónter
          </Button>
        </div>
      </main>
    </div>
  );
}
