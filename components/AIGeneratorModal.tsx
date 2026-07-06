import React, { useState } from 'react';
import { Button } from './Button';
import { generateScript } from '../services/geminiService';
import { Sparkles, X, AlertCircle } from 'lucide-react';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScriptGenerated: (script: string) => void;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ isOpen, onClose, onScriptGenerated }) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Profesional');
  const [audience, setAudience] = useState('Público General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Por favor ingresa un tema.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const script = await generateScript(topic, tone, audience);
      onScriptGenerated(script);
      onClose();
    } catch (err) {
      setError("Falló la generación del guion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center text-indigo-400">
            <Sparkles className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold text-white">Escritor IA</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">¿De qué trata tu video?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ej., Los beneficios del trabajo remoto..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tono</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none"
              >
                <option>Profesional</option>
                <option>Casual</option>
                <option>Entusiasta</option>
                <option>Serio</option>
                <option>Humorístico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audiencia</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none"
              >
                <option>Público General</option>
                <option>Empleados</option>
                <option>Estudiantes</option>
                <option>Inversores</option>
                <option>Clientes</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleGenerate} isLoading={loading} className="flex-1">
              Generar Guion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};