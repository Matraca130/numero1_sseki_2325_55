// ============================================================
// Axon — Login / Signup Page
// Evolution Premium: Forest Canopy + Teal brand.
// Playfair Display headings, DM Sans labels, organic textures.
// ============================================================
import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { motion } from 'motion/react';
import { Eye, EyeOff, LogIn, UserPlus, Loader2, AlertCircle, CheckCircle2, Leaf } from 'lucide-react';

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
          setError(res.error || 'Error al iniciar sesion');
        } else {
          const from = (location.state as any)?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      } else {
        if (!name.trim()) { setError('El nombre es obligatorio'); setLoading(false); return; }
        if (password.length < 8) { setError('La contrasena debe tener al menos 8 caracteres'); setLoading(false); return; }
        const res = await signup(email, password, name);
        if (!res.success) {
          setError(res.error || 'Error al crear cuenta');
        } else {
          setSuccess('Cuenta creada exitosamente');
          navigate('/', { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0f2b26]">
      {/* Left Panel — Forest Canopy Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {/* Organic gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 80%, rgba(42, 140, 122, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(45, 74, 43, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(107, 143, 94, 0.15) 0%, transparent 60%),
              linear-gradient(135deg, #1B3B36 0%, #0f2b26 40%, #2d4a2b 100%)
            `,
          }}
        />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Floating organic shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-teal-500/[0.06] blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 20, 0], rotate: [0, -2, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-[20%] right-[5%] w-80 h-80 rounded-full bg-[#2d4a2b]/20 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.12, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#a4ac86]/10 blur-3xl"
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <AxonLogo size="lg" theme="light" />
            <p
              className="text-[#8fbfb3] text-sm mt-4 max-w-xs mx-auto leading-relaxed"
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
              Plataforma de Estudos Medicos
            </p>

            {/* Feature list */}
            <div className="mt-12 space-y-5 text-left max-w-xs mx-auto">
              {[
                { text: 'Flashcards con repeticion espaciada (FSRS)', icon: '01' },
                { text: 'Quizzes adaptativos con IA', icon: '02' },
                { text: 'Dashboard de progreso en tiempo real', icon: '03' },
                { text: 'Sistema multi-institucional', icon: '04' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="text-[10px] font-bold text-teal-400/60 mt-0.5 tracking-wider"
                    style={{ fontFamily: '"DM Sans", sans-serif' }}
                  >
                    {feature.icon}
                  </span>
                  <span className="text-[#8fbfb3]/70 text-xs leading-relaxed">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Decorative leaf accent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-16 flex items-center justify-center gap-2 text-[#a4ac86]/30"
            >
              <div className="w-12 h-px bg-[#a4ac86]/20" />
              <Leaf className="w-3.5 h-3.5" />
              <div className="w-12 h-px bg-[#a4ac86]/20" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <AxonLogo size="md" theme="light" />
          </div>

          <div className="bg-[#1a2e2a] rounded-2xl border border-white/[0.06] p-8 shadow-2xl shadow-black/20">
            <div className="mb-6">
              <h1
                className="text-2xl text-white tracking-tight"
                style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600 }}
              >
                {mode === 'signin' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
              </h1>
              <p
                className="text-sm text-[#8fbfb3]/70 mt-1.5"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                {mode === 'signin'
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Registrate para empezar a estudiar'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-emerald-300">{success}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    className="block text-xs font-semibold text-[#8fbfb3]/80 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: '"DM Sans", sans-serif' }}
                  >
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-2.5 bg-[#0f2b26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#8fbfb3]/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-semibold text-[#8fbfb3]/80 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 bg-[#0f2b26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#8fbfb3]/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-[#8fbfb3]/80 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  Contrasena
                  {mode === 'signup' && (
                    <span className="text-[#8fbfb3]/40 ml-1 normal-case tracking-normal">(min. 8 caracteres)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Minimo 8 caracteres' : 'Tu contrasena'}
                    className="w-full px-4 py-2.5 pr-10 bg-[#0f2b26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#8fbfb3]/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all"
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fbfb3]/40 hover:text-[#8fbfb3]/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 text-white py-3 px-4 rounded-xl transition-all duration-200 text-sm font-semibold shadow-lg shadow-teal-900/30 hover:shadow-teal-800/40 disabled:shadow-none disabled:cursor-not-allowed"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
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
                    ? 'Iniciar sesion'
                    : 'Crear cuenta'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-[#8fbfb3]/50">
                {mode === 'signin' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}
              </span>
              <button
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="ml-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {mode === 'signin' ? 'Registrate' : 'Inicia sesion'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs text-[#8fbfb3]/30">Conectado al backend</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
