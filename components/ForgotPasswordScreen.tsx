import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/apiService';
import { Button } from './Button';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-dvh bg-upf-black text-slate-200 flex flex-col items-center justify-center p-4 bg-grid">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/brand/upfunnel-logo-horizontal.png"
            alt="Upfunnel"
            className="h-10 sm:h-12 mb-4"
          />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Recuperar contraseña
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-upf-cyan" />
              </div>
              <p className="text-slate-300">
                Si existe una cuenta con ese correo, te hemos enviado un enlace para restablecer tu contraseña.
              </p>
              <p className="text-sm text-slate-500">
                Revisa tu bandeja de entrada (y la carpeta de spam). El enlace expira en 1 hora.
              </p>
              <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">
                Ingresa tu correo y te enviaremos un enlace para crear una contraseña nueva.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    autoFocus
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-upf-cyan focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center text-upf-cyan text-sm bg-upf-cyan/10 border border-upf-cyan/30 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-upf-cyan" />
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={loading} className="w-full">
                Enviar enlace
              </Button>
            </form>
          )}

          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-upf-cyan transition-colors mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
