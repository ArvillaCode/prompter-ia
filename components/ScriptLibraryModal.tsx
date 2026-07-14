import React from 'react';
import { SavedScript } from '../types';
import { Button } from './Button';
import { FolderOpen, X, Plus, Copy, Trash2, FileText } from 'lucide-react';

interface ScriptLibraryModalProps {
  isOpen: boolean;
  scripts: SavedScript[];
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const wordCount = (text: string) => (text.trim() === '' ? 0 : text.trim().split(/\s+/).length);

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ScriptLibraryModal: React.FC<ScriptLibraryModalProps> = ({
  isOpen, scripts, activeId, onClose, onSelect, onNew, onDuplicate, onDelete,
}) => {
  if (!isOpen) return null;

  const sorted = [...scripts].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-indigo-400">
            <FolderOpen className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold text-white">Mis Guiones</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <Button onClick={onNew} icon={<Plus className="w-4 h-4" />} className="w-full mb-4">
          Nuevo Guion
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2 -mr-2 pr-2">
          {sorted.map((s) => (
            <div
              key={s.id}
              onClick={() => { onSelect(s.id); onClose(); }}
              className={`group p-3 rounded-xl border cursor-pointer transition-colors flex items-center gap-3 ${
                s.id === activeId
                  ? 'bg-indigo-600/10 border-indigo-600/50'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 ${s.id === activeId ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{s.title || 'Sin título'}</div>
                <div className="text-xs text-slate-500">
                  {wordCount(s.content)} palabras · {formatDate(s.updatedAt)}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                  title="Duplicar"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`¿Eliminar "${s.title || 'Sin título'}"? Esta acción no se puede deshacer.`)) {
                      onDelete(s.id);
                    }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
