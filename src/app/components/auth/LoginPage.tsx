// ============================================================
// Axon — Login / Signup Page
// Calls login() and signup() from AuthContext.
// Dark mode, teal accent.
// ============================================================
import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { colors } from '@/app/design-system';
import { motion } from 'motion/react';
import { Eye, EyeOff, LogIn, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export function LoginPage() {
  const { login, signup, status, institutions, memberships } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If authenticated AND has institution data, redirect to post-login router.
  // If authenticated but no institutions (fetch failed or no memberships), stay on login
  // to avoid infinite loop: PostLoginRouter → /login → / → PostLoginRouter
  if (status === 'authenticated' && (institutions.length > 0 || memberships.length > 0)) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (newMode: AuthMode) => {
    setEmail(''); setPassword(''); setName('');
    setError(null); setSuccess(null);
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Error al iniciar sesión');
        } else {
          const rawFrom = (location.state as any)?.from?.pathname;
          let from = '/';
          if (typeof rawFrom === 'string' && rawFrom.length > 0) {
            try {
              const url = new URL(rawFrom, window.location.origin);
              const path = url.pathname + url.search + url.hash;
              if (url.origin === window.location.origin && path.startsWith('/') && !path.startsWith('//')) {
                from = path;
              }
            } catch {
              // Invalid URL — fall through to '/'
            }
          }
          navigate(from, { replace: true });
        }
      } else {
        if (!name.trim()) { setError('El nombre es obligatorio'); setLoading(false); return; }
        if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); setLoading(false); return; }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
          setError('La contrasena debe incluir mayusculas, minusculas y numeros');
          setLoading(false);
          return;
        }
        const res = await signup(email, password, name);
        if (!res.success) {
          setError(res.error || 'Error al crear cuenta');
        } else {
          setSuccess('Revisa tu email para confirmar tu cuenta. Luego podras iniciar sesion.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-zinc-950">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden"
        style={{ backgroundColor: colors.primary[900] }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-teal-600 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-teal-700 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-teal-500 blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <AxonLogo size="lg" theme="light" />
            <p className="text-white/50 text-sm mt-4 max-w-xs mx-auto leading-relaxed">
              Plataforma de Estudos Medicos
            </p>
            <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
              {[
                'Flashcards con repeticion espaciada (FSRS)',
                'Quizzes adaptativos con IA',
                'Dashboard de progreso en tiempo real',
                'Sistema multi-institucional',
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  <span className="text-white/40 text-xs">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <AxonLogo size="md" theme="light" />
          </div>

          <Card
            className="rounded-2xl border-white/[0.06] p-8 gap-0"
            style={{ backgroundColor: '#18181b' }}
          >
            <div className="mb-6">
              <h1 className="text-2xl text-white">
                {mode === 'signin' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
              </h1>
              <p className="text-sm text-zinc-300 mt-1">
                {mode === 'signin'
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Regístrate para empezar a estudiar'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-emerald-300">{success}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="signup-name" className="block text-sm text-zinc-200 mb-1.5">Nombre completo</label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="h-10 px-4 py-2.5 bg-zinc-800 border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-400 focus-visible:ring-teal-500/30 focus-visible:border-teal-500/50"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-sm text-zinc-200 mb-1.5">Email</label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-10 px-4 py-2.5 bg-zinc-800 border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-400 focus-visible:ring-teal-500/30 focus-visible:border-teal-500/50"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm text-zinc-200 mb-1.5">
                  Contraseña
                  {mode === 'signup' && (
                    <span className="text-zinc-400 ml-1">(min. 8 caracteres)</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                    className="h-10 px-4 py-2.5 pr-10 bg-zinc-800 border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-400 focus-visible:ring-teal-500/30 focus-visible:border-teal-500/50"
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={loading}
                className="w-full rounded-full text-white font-semibold text-sm disabled:cursor-not-allowed"
                style={{
                  backgroundColor: loading ? `${colors.primary[500]}80` : colors.primary[500],
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = colors.primary[600];
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = colors.primary[500];
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'signin' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading
                  ? 'Conectando...'
                  : mode === 'signin'
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-zinc-500">
                {mode === 'signin' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}
              </span>
              <button
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="ml-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {mode === 'signin' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </Card>

          {import.meta.env.DEV && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs text-zinc-600">Conectado al backend</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
