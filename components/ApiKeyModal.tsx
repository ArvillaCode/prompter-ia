import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { apiKeyApi } from '../services/apiService';
import { KeyRound, X, AlertCircle, ShieldCheck, Trash2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [hasKey, setHasKey] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setNewKey('');
    apiKeyApi.get()
      .then(data => { setHasKey(data.hasKey); setLast4(data.last4); setInvalid(data.invalid ?? false); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newKey.trim()) {
      setError('Ingresa tu API key de Gemini.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiKeyApi.save(newKey.trim());
      setHasKey(data.hasKey);
      setLast4(data.last4);
      setInvalid(false);
      setNewKey('');
      setSuccess('API key guardada. Tus generaciones con IA ahora usan tu propia key, sin límite del plan.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar tu API key? Volverás a usar la generación incluida en tu plan.')) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiKeyApi.remove();
      setHasKey(false);
      setLast4(null);
      setInvalid(false);
      setSuccess('API key eliminada.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-upf-black border border-upf-cyan/20 rounded-2xl shadow-2xl shadow-upf-cyan/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-upf-cyan">
            <KeyRound className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold text-white">Mi API Key de Gemini</h2>
          </div>
          <button onClick={onClose} className="text-upf-slate hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-upf-slate mb-4">
          Configura tu propia API key de Google Gemini para generar guiones sin depender del límite de tu plan.
          Consíguela gratis en{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-upf-cyan hover:underline">
            aistudio.google.com/apikey
          </a>.
        </p>

        <div className="flex items-start gap-2 text-xs text-upf-slate bg-upf-cyan/5 border border-upf-cyan/10 rounded-lg p-3 mb-4">
          <ShieldCheck className="w-4 h-4 text-upf-cyan flex-shrink-0 mt-0.5" />
          <span>
            Tu key se guarda cifrada (AES-256) en el servidor y nunca se muestra completa ni viaja a tu navegador.
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-upf-cyan border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-upf-black border border-upf-slate/30 rounded-lg p-3">
              <div className="text-sm">
                <span className="text-upf-slate">Estado: </span>
                {hasKey ? (
                  invalid ? (
                    <span className="text-amber-400 font-medium">Guardada pero ilegible — elimínala o guarda una nueva</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Configurada (••••{last4})</span>
                  )
                ) : (
                  <span className="text-upf-slate">Sin configurar</span>
                )}
              </div>
              {hasKey && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-upf-slate mb-1">
                {hasKey ? 'Reemplazar API key' : 'API key'}
              </label>
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-upf-black border border-upf-slate/30 rounded-lg p-3 text-white font-mono focus:ring-2 focus:ring-upf-cyan focus:border-transparent outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded-lg">
                <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={onClose} className="flex-1">Cerrar</Button>
              <Button variant="brand" onClick={handleSave} isLoading={saving} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
