import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/apiService';
import { Button } from './Button';
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
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
            Nueva contraseña
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-upf-cyan" />
              </div>
              <p className="text-slate-300">
                Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Ir a iniciar sesión
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-upf-cyan" />
              </div>
              <p className="text-slate-300">
                El enlace no es válido. Solicita uno nuevo desde la opción de recuperar contraseña.
              </p>
              <Button variant="secondary" onClick={() => navigate('/forgot-password')} className="w-full">
                Solicitar enlace nuevo
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoFocus
                    autoComplete="new-password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-upf-cyan focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center text-upf-cyan text-sm bg-upf-cyan/10 border border-upf-cyan/30 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-upf-cyan" />
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={loading} disabled={!password} className="w-full">
                Restablecer contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
