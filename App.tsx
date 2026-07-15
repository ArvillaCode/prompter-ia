import React, { useState, useEffect } from 'react';
import { AppMode, PrompterSettings, SavedScript } from './types';
import { PrompterView } from './components/PrompterView';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { ScriptLibraryModal } from './components/ScriptLibraryModal';
import { Button } from './components/Button';
import { Play, Sparkles, Mic, FileText, Type, FolderOpen } from 'lucide-react';

const DEFAULT_SCRIPT = `Bienvenido a ProPrompter AI.

Este es un guion de demostración para mostrarte cómo funciona el teleprónter.

Puedes editar este texto en la vista del editor, o usar nuestras herramientas de IA para generar un guion por ti.

Haz clic en el botón "Play" para comenzar el desplazamiento.

Puedes ajustar la velocidad, el tamaño de la fuente y las opciones de espejo en el panel de control inferior.

¡También puedes habilitar la cámara para grabar tu presentación!

¡Buena suerte con tu grabación!`;

const DEFAULT_SETTINGS: PrompterSettings = {
  scrollSpeed: 20,
  fontSize: 64,
  isMirroredX: false,
  isMirroredY: false,
  useCamera: false,
  margin: 10,
  opacity: 1,
  lineHeight: 1.5,
  facingMode: 'user'
};

const SCRIPTS_STORAGE_KEY = 'proprompter-scripts';
const ACTIVE_STORAGE_KEY = 'proprompter-active-script';
const LEGACY_SCRIPT_KEY = 'proprompter-script';
const SETTINGS_STORAGE_KEY = 'proprompter-settings';

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const loadScripts = (): SavedScript[] => {
  try {
    const raw = localStorage.getItem(SCRIPTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignorar datos corruptos y arrancar limpio
  }
  // Migrar el guion único de versiones anteriores
  const legacy = localStorage.getItem(LEGACY_SCRIPT_KEY);
  return [{ id: newId(), title: 'Mi guion', content: legacy ?? DEFAULT_SCRIPT, updatedAt: Date.now() }];
};

const loadSavedSettings = (): PrompterSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignorar settings corruptos y usar los valores por defecto
  }
  return DEFAULT_SETTINGS;
};

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [scripts, setScripts] = useState<SavedScript[]>(loadScripts);
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem(ACTIVE_STORAGE_KEY) ?? '');
  const [settings, setSettings] = useState<PrompterSettings>(loadSavedSettings);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [estTime, setEstTime] = useState(0);

  const activeScript = scripts.find(s => s.id === activeId) ?? scripts[0];
  const script = activeScript.content;

  const updateActive = (patch: Partial<Pick<SavedScript, 'title' | 'content'>>) => {
    setScripts(prev => prev.map(s => (s.id === activeScript.id ? { ...s, ...patch, updatedAt: Date.now() } : s)));
  };

  const handleNewScript = () => {
    const fresh: SavedScript = { id: newId(), title: 'Guion sin título', content: '', updatedAt: Date.now() };
    setScripts(prev => [...prev, fresh]);
    setActiveId(fresh.id);
    setIsLibraryOpen(false);
  };

  const handleDuplicateScript = (id: string) => {
    const source = scripts.find(s => s.id === id);
    if (!source) return;
    const copy: SavedScript = { ...source, id: newId(), title: `${source.title} (copia)`, updatedAt: Date.now() };
    setScripts(prev => [...prev, copy]);
  };

  const handleDeleteScript = (id: string) => {
    setScripts(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const fresh: SavedScript = { id: newId(), title: 'Guion sin título', content: '', updatedAt: Date.now() };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeScript.id) {
        const mostRecent = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveId(mostRecent.id);
      }
      return remaining;
    });
  };

  useEffect(() => {
    const words = script.trim().split(/\s+/).length;
    setWordCount(script.trim() === '' ? 0 : words);
    // Average speaking rate ~130 wpm
    setEstTime(Math.ceil(words / 130));
  }, [script]);

  // Autosave library (debounced), active selection and settings
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
    }, 500);
    return () => clearTimeout(timeout);
  }, [scripts]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, activeScript.id);
  }, [activeScript.id]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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
        activeId={activeScript.id}
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
            <Button
              variant="ghost"
              onClick={() => setIsLibraryOpen(true)}
              className="hidden sm:flex"
              icon={<FolderOpen className="w-4 h-4 text-indigo-400" />}
            >
              Mis Guiones
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsAIModalOpen(true)}
              className="hidden sm:flex"
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            >
              Escritor IA
            </Button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
            <Button
              onClick={() => setMode(AppMode.PROMPTER)}
              icon={<Play className="w-4 h-4 fill-current" />}
              className="shadow-lg shadow-indigo-500/20"
            >
              Iniciar Teleprónter
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">

        {/* Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between shadow-sm">
          <input
            value={activeScript.title}
            onChange={(e) => updateActive({ title: e.target.value })}
            placeholder="Título del guion..."
            className="flex-1 min-w-[180px] bg-transparent text-base font-semibold text-white placeholder-slate-600 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors pb-0.5"
          />
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{wordCount} palabras</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span>~{estTime} min lectura</span>
            </div>
          </div>

          <div className="flex gap-2 sm:hidden">
             <Button
              variant="secondary"
              onClick={() => setIsLibraryOpen(true)}
              className="text-xs px-3 py-1 h-8"
              icon={<FolderOpen className="w-3 h-3 text-indigo-400" />}
            >
              Guiones
            </Button>
             <Button
              variant="secondary"
              onClick={() => setIsAIModalOpen(true)}
              className="text-xs px-3 py-1 h-8"
              icon={<Sparkles className="w-3 h-3 text-purple-400" />}
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
            className="w-full h-full min-h-[500px] bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-lg leading-relaxed text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none resize-none shadow-inner"
            spellCheck={false}
          />
          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Autoguardado</span>
          </div>
        </div>
      </main>
    </div>
  );
}
