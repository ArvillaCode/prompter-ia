import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const SCRIPTS_STORAGE_KEY = 'proprompter-scripts';
const ACTIVE_STORAGE_KEY = 'proprompter-active-script';
const SETTINGS_STORAGE_KEY = 'proprompter-settings';
const SYNC_TIME_KEY = 'proprompter-last-sync';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [scripts, setScriptsState] = useState<SavedScript[]>([]);
  const [activeId, setActiveIdState] = useState<string>('');
  const [settings, setSettingsState] = useState<PrompterSettings>(() => loadLocalSettings());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // --- Load from cloud when user authenticates ---
  useEffect(() => {
    if (!user) {
      // Guest mode: load from localStorage
      setScriptsState(loadLocalScripts());
      setActiveIdState(localStorage.getItem(ACTIVE_STORAGE_KEY) ?? '');
      return;
    }

    // Authenticated: load from cloud
    setSyncStatus('syncing');
    Promise.all([scriptsApi.list(), settingsApi.get()])
      .then(async ([scriptsRes, settingsRes]) => {
        const cloudScripts = scriptsRes.scripts;

        // Migration: if cloud is empty but localStorage has data, push local to cloud
        if (cloudScripts.length === 0) {
          const localScripts = loadLocalScripts();
          const localSettings = loadLocalSettings();
          if (localScripts.length > 0) {
            const syncRes = await syncApi.sync({
              scripts: localScripts,
              settings: localSettings,
              lastSyncAt: null,
            });
            setScriptsState(syncRes.scripts);
            setSettingsState(syncRes.settings ?? localSettings);
            setLastSyncAt(syncRes.syncTimestamp);
            // Clear local storage after successful migration
            localStorage.removeItem(SCRIPTS_STORAGE_KEY);
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
          } else {
            setScriptsState([]);
            if (settingsRes.settings) setSettingsState(settingsRes.settings);
          }
        } else {
          setScriptsState(cloudScripts);
          if (settingsRes.settings) setSettingsState(settingsRes.settings);
        }
        setSyncStatus('idle');
      })
      .catch(() => setSyncStatus('error'));
  }, [user]);

  // --- Debounced cloud sync when scripts or settings change ---
  const scheduleSync = useCallback(() => {
    if (!user) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const res = await syncApi.sync({
          scripts,
          settings,
          lastSyncAt: lastSyncAt,
        });
        setLastSyncAt(res.syncTimestamp);
        setSyncStatus('idle');
      } catch {
        setSyncStatus('error');
      }
    }, 1000);
  }, [user, scripts, settings, lastSyncAt]);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    scheduleSync();
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

  const setScripts = useCallback((updater: any) => {
    setScriptsState(updater);
  }, []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
  }, []);

  const setSettings = useCallback((updater: any) => {
    setSettingsState(updater);
  }, []);

  const forceSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      const res = await syncApi.sync({ scripts, settings, lastSyncAt });
      setLastSyncAt(res.syncTimestamp);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [user, scripts, settings, lastSyncAt]);

  return (
    <DataContext.Provider
      value={{ scripts, activeId, settings, setScripts, setActiveId, setSettings, syncStatus, lastSyncAt, forceSync }}
    >
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
