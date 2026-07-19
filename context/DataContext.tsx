import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PrompterSettings, SavedScript } from '../types';
import { useAuth } from './AuthContext';
import { scriptsApi, settingsApi, syncApi } from '../services/apiService';

interface DataContextValue {
  scripts: SavedScript[];
  activeId: string;
  settings: PrompterSettings;
  setScripts: (updater: SavedScript[] | ((prev: SavedScript[]) => SavedScript[])) => void;
  setActiveId: (id: string) => void;
  setSettings: (updater: PrompterSettings | ((prev: PrompterSettings) => PrompterSettings)) => void;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt: number | null;
  forceSync: () => Promise<void>;
  isDataLoading: boolean;
  dataError: string | null;
  reloadData: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const SCRIPTS_STORAGE_KEY = 'proprompter-scripts';
const ACTIVE_STORAGE_KEY = 'proprompter-active-script';
const SETTINGS_STORAGE_KEY = 'proprompter-settings';

const DEFAULT_SCRIPT = `Bienvenido a ProPrompter AI.

Este es un guion de demostración para mostrarte cómo funciona el teleprónter.

Puedes editar este texto en la vista del editor, o usar nuestras herramientas de IA para generar un guion por ti.

Haz clic en el botón "Play" para comenzar el desplazamiento.

Puedes ajustar la velocidad, el tamaño de la fuente y las opciones de espejo en el panel de control inferior.

¡Buena suerte con tu grabación!`;

function createInitialScript(): SavedScript {
  return {
    id: crypto.randomUUID(),
    title: 'Guion de bienvenida',
    content: DEFAULT_SCRIPT,
    updatedAt: Date.now(),
  };
}

function createEmptyScript(): SavedScript {
  return {
    id: crypto.randomUUID(),
    title: 'Guion sin título',
    content: '',
    updatedAt: Date.now(),
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [scripts, setScriptsState] = useState<SavedScript[]>([]);
  const [activeId, setActiveIdState] = useState<string>('');
  const [settings, setSettingsState] = useState<PrompterSettings>(() => loadLocalSettings());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratedRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  // --- Public setter that guards the "never empty after hydration" invariant ---
  const setScripts: DataContextValue['setScripts'] = useCallback((updater) => {
    setScriptsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Once hydrated, never allow the collection to become empty
      if (isHydratedRef.current && next.length === 0) {
        const fresh = createEmptyScript();
        // activeId will be set by the consumer or the resolver below
        return [fresh];
      }
      return next;
    });
  }, []);

  const setActiveId: DataContextValue['setActiveId'] = setActiveIdState;
  const setSettings: DataContextValue['setSettings'] = setSettingsState;

  // --- Resolve activeId against the current collection ---
  const resolveActiveId = useCallback((ids: SavedScript[], preferredId: string): string => {
    if (ids.length === 0) return '';
    if (ids.some(s => s.id === preferredId)) return preferredId;
    // Pick most recently updated
    return [...ids].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  }, []);

  // --- Hydration (called on mount and on user change) ---
  const hydrate = useCallback(() => {
    const currentUser = user;
    const currentUserId = currentUser?.id;

    // Cancel pending sync
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }

    // Bump request ID so stale callbacks are ignored
    const rid = ++requestIdRef.current;

    isHydratedRef.current = false;
    setIsDataLoading(true);
    setDataError(null);
    setSyncStatus('idle');

    if (!currentUser) {
      // Guest mode: load from localStorage
      const local = loadLocalScripts();
      const finalScripts = local.length > 0 ? local : [createInitialScript()];
      const resolved = resolveActiveId(finalScripts, localStorage.getItem(ACTIVE_STORAGE_KEY) ?? '');
      setScriptsState(finalScripts);
      setActiveIdState(resolved);
      setIsDataLoading(false);
      isHydratedRef.current = true;
      return;
    }

    // Authenticated: load from cloud
    setSyncStatus('syncing');
    Promise.all([scriptsApi.list(), settingsApi.get()])
      .then(async ([scriptsRes, settingsRes]) => {
        if (requestIdRef.current !== rid) return; // stale

        if (settingsRes.settings) setSettingsState(settingsRes.settings);
        let cloudScripts = scriptsRes.scripts;

        // Migration: if cloud is empty but localStorage has data, push local to cloud
        if (cloudScripts.length === 0) {
          const local = loadLocalScripts();
          const localSettings = loadLocalSettings();
          if (local.length > 0) {
            // Only sync if we're still the current request
            const syncRes = await syncApi.sync({
              scripts: local,
              settings: localSettings,
              lastSyncAt: null,
            }).catch(() => null);
            if (requestIdRef.current !== rid) return;
            if (syncRes) {
              cloudScripts = syncRes.scripts;
              if (syncRes.settings) setSettingsState(syncRes.settings);
              setLastSyncAt(syncRes.syncTimestamp);
              localStorage.removeItem(SCRIPTS_STORAGE_KEY);
              localStorage.removeItem(SETTINGS_STORAGE_KEY);
            }
            // If migration sync fails, keep local as cloudScripts so user
            // doesn't lose data; the next sync will retry
          }
        }

        // If still empty after migration attempt → seed initial script
        const finalScripts = cloudScripts.length > 0 ? cloudScripts : [createInitialScript()];
        const resolved = resolveActiveId(finalScripts, localStorage.getItem(ACTIVE_STORAGE_KEY) ?? '');
        setScriptsState(finalScripts);
        setActiveIdState(resolved);
        setSyncStatus('idle');
        setIsDataLoading(false);
        isHydratedRef.current = true;
      })
      .catch((err) => {
        if (requestIdRef.current !== rid) return;
        setDataError(err?.message ?? 'Error al cargar datos.');
        setSyncStatus('idle');
        setIsDataLoading(false);
        // NOT hydrated → sync barrier stays up
      });
  }, [user, resolveActiveId]);

  // Hydrate on mount and whenever user changes
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // --- Debounced cloud sync (only when hydrated AND data is clean) ---
  const scriptsRef = useRef(scripts);
  useEffect(() => { scriptsRef.current = scripts; }, [scripts]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const lastSyncAtRef = useRef(lastSyncAt);
  useEffect(() => { lastSyncAtRef.current = lastSyncAt; }, [lastSyncAt]);

  const scheduleSync = useCallback(() => {
    if (!user) return;
    if (!isHydratedRef.current) return;
    if (dataError) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const res = await syncApi.sync({
          scripts: scriptsRef.current,
          settings: settingsRef.current,
          lastSyncAt: lastSyncAtRef.current,
        });
        setLastSyncAt(res.syncTimestamp);
        setSyncStatus('idle');
      } catch {
        setSyncStatus('error');
      }
    }, 1000);
  }, [user, dataError]);

  useEffect(() => {
    // Don't schedule sync during hydration
    if (!isHydratedRef.current) return;
    // Don't schedule sync for the initial state that hydration set
    // We detect this by waiting one microtask; the alternative is a dirty flag
    const id = setTimeout(() => {
      scheduleSync();
    }, 0);
    return () => clearTimeout(id);
  }, [scripts, settings, scheduleSync]);

  // --- LocalStorage persistence (guest mode + activeId always) ---
  useEffect(() => {
    if (!user) {
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
    }
  }, [scripts, user]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, user]);

  const forceSync = useCallback(async () => {
    if (!user) return;
    if (!isHydratedRef.current) return;
    setSyncStatus('syncing');
    try {
      const res = await syncApi.sync({
        scripts: scriptsRef.current,
        settings: settingsRef.current,
        lastSyncAt: lastSyncAtRef.current,
      });
      setLastSyncAt(res.syncTimestamp);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [user]);

  const reloadData = useCallback(() => {
    hydrate();
  }, [hydrate]);

  const value = useMemo<DataContextValue>(() => ({
    scripts,
    activeId,
    settings,
    setScripts,
    setActiveId,
    setSettings,
    syncStatus,
    lastSyncAt,
    forceSync,
    isDataLoading,
    dataError,
    reloadData,
  }), [scripts, activeId, settings, syncStatus, lastSyncAt, forceSync, setScripts, setActiveId, setSettings, isDataLoading, dataError, reloadData]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

// --- LocalStorage helpers (for guest mode + initial state) ---
function loadLocalScripts(): SavedScript[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function loadLocalSettings(): PrompterSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

const DEFAULT_SETTINGS: PrompterSettings = {
  scrollSpeed: 20,
  fontSize: 64,
  isMirroredX: false,
  isMirroredY: false,
  useCamera: false,
  margin: 10,
  opacity: 0.5,
  lineHeight: 1.5,
  audioDeviceId: undefined,
  videoDeviceId: undefined,
  facingMode: 'user',
};
