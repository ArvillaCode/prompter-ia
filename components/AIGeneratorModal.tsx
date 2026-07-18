import React, { useState } from 'react';
import { Button } from './Button';
import { generateScript } from '../services/geminiService';
import {
  OBJETIVOS,
  AUDIENCIAS,
  FORMATOS,
  DURACIONES_REEL,
  OBJETIVO_LABELS,
  AUDIENCIA_LABELS,
  type Objetivo,
  type Audiencia,
  type Formato,
} from '../services/brandVoice';
import { Sparkles, X, AlertCircle } from 'lucide-react';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScriptGenerated: (script: string) => void;
}

const inputClass =
  'w-full bg-upf-black border border-upf-slate/30 rounded-lg p-3 text-white focus:ring-2 focus:ring-upf-cyan focus:border-transparent outline-none';

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ isOpen, onClose, onScriptGenerated }) => {
  const [topic, setTopic] = useState('');
  const [formato, setFormato] = useState<Formato>('video');
  const [objetivo, setObjetivo] = useState<Objetivo>('educar');
  const [audiencia, setAudiencia] = useState<Audiencia>('emprendedores');
  const [duracion, setDuracion] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Por favor ingresa un tema.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const script = await generateScript({
        topic,
        formato,
        objetivo,
        audiencia,
        duracion: formato === 'reel' ? duracion : undefined,
      });
      onScriptGenerated(script);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falló la generación del guion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-upf-black border border-upf-cyan/20 rounded-2xl shadow-2xl shadow-upf-cyan/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center text-upf-cyan">
            <Sparkles className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold text-white">Generar con IA</h2>
          </div>
          <button onClick={onClose} className="text-upf-slate hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-upf-slate mb-1">¿De qué trata tu video?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ej., Cómo los agentes IA le ahorran tiempo a un solopreneur..."
              maxLength={500}
              className={`${inputClass} h-24 resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-upf-slate mb-1">Formato</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormato(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formato === f
                      ? 'bg-upf-cyan/10 border-upf-cyan text-upf-cyan'
                      : 'bg-transparent border-upf-slate/30 text-upf-slate hover:text-white'
                  }`}
                >
                  {f === 'video' ? 'Video (con saludo)' : 'Reel corto (gancho directo)'}
                </button>
              ))}
            </div>
          </div>

          {formato === 'reel' && (
            <div>
              <label className="block text-sm font-medium text-upf-slate mb-1">Duración</label>
              <div className="grid grid-cols-3 gap-2">
                {DURACIONES_REEL.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuracion(d)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      duracion === d
                        ? 'bg-upf-cyan/10 border-upf-cyan text-upf-cyan'
                        : 'bg-transparent border-upf-slate/30 text-upf-slate hover:text-white'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-upf-slate mb-1">Objetivo</label>
              <select
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value as Objetivo)}
                className={inputClass}
              >
                {OBJETIVOS.map((o) => (
                  <option key={o} value={o}>
                    {OBJETIVO_LABELS[o]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-upf-slate mb-1">Audiencia</label>
              <select
                value={audiencia}
                onChange={(e) => setAudiencia(e.target.value as Audiencia)}
                className={inputClass}
              >
                {AUDIENCIAS.map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCIA_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button variant="brand" onClick={handleGenerate} isLoading={loading} className="flex-1">
              Generar Guion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
