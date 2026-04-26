import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('washsync_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function LoginPage({
  adminMode = false,
}: {
  adminMode?: boolean;
}) {
  const branding = JSON.parse(localStorage.getItem('branding') || '{}');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, businessSlug } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const routeSlug = adminMode ? undefined : slug || '';
      await login(email.trim(), password.trim(), routeSlug);

await sleep(100);

const savedUser = getStoredUser();
const savedSlug =
  localStorage.getItem('washsync_business_slug') || businessSlug || slug;

if (adminMode) {
  navigate('/admin', { replace: true });
  return;
}

if (savedUser?.role === 'ADMIN') {
  navigate('/admin', { replace: true });
  return;
}

if (savedSlug) {
  navigate(`/empresa/${savedSlug}`, { replace: true });
  return;
}

navigate('/admin/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-cyan-100 via-sky-50 to-blue-200 px-4 py-10">
      {/* Gotas decorativas — maiores, mais visíveis e realistas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Gota grande superior esquerda */}
        <motion.div
          className="absolute left-[8%] top-[8%] h-20 w-20 rounded-full bg-gradient-to-br from-white/90 via-white/40 to-cyan-200/30 ring-2 ring-white/70 shadow-xl shadow-sky-300/40 backdrop-blur-sm"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Brilho dentro da gota grande */}
        <motion.div
          className="absolute left-[10%] top-[9%] h-5 w-5 rounded-full bg-white/90 blur-sm"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Gota média superior direita */}
        <motion.div
          className="absolute right-[8%] top-[14%] h-14 w-14 rounded-full bg-gradient-to-br from-white/80 via-white/30 to-sky-200/30 ring-2 ring-white/60 shadow-lg shadow-sky-300/40 backdrop-blur-sm"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Gota pequena meio-esquerda */}
        <motion.div
          className="absolute left-[6%] top-[45%] h-10 w-10 rounded-full bg-gradient-to-br from-white/80 to-cyan-200/30 ring-1 ring-white/70 shadow-md shadow-sky-300/30 backdrop-blur-sm"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* Gota grande inferior direita */}
        <motion.div
          className="absolute bottom-[12%] right-[6%] h-24 w-24 rounded-full bg-gradient-to-br from-white/85 via-white/35 to-sky-200/30 ring-2 ring-white/60 shadow-xl shadow-sky-300/40 backdrop-blur-sm"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        {/* Brilho dentro da gota grande inferior */}
        <motion.div
          className="absolute bottom-[20%] right-[12%] h-6 w-6 rounded-full bg-white/90 blur-sm"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Gota pequena inferior esquerda */}
        <motion.div
          className="absolute bottom-[20%] left-[10%] h-8 w-8 rounded-full bg-gradient-to-br from-white/80 to-sky-200/30 ring-1 ring-white/70 shadow-md backdrop-blur-sm"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card glassmorphism mais translúcido */}
        <div className="rounded-3xl border border-white/70 bg-white/30 p-8 shadow-2xl shadow-sky-300/30 backdrop-blur-2xl sm:p-10">
          {/* Logo + título */}
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-4 flex h-28 w-28 items-center justify-center"
            >
              <img
                src={branding.logoUrl || '/WashSync-Logo.png'}
                alt={branding.name || 'WashSync'}
                className="h-full w-full object-contain drop-shadow-lg"
              />
            </motion.div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {branding.name || 'WashSync'}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Sistema de Gestão para Lava-Jatos
            </p>
            <p className="mt-6 text-base text-slate-700">
              Faça login para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email */}
            <div className="group relative rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm transition-all focus-within:border-cyan-400 focus-within:bg-white/90 focus-within:ring-2 focus-within:ring-cyan-400/30">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-cyan-600" />
                <div className="flex-1">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-slate-500"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    className="h-6 border-0 bg-transparent p-0 text-base font-medium text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Input Senha */}
            <div className="group relative rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm transition-all focus-within:border-cyan-400 focus-within:bg-white/90 focus-within:ring-2 focus-within:ring-cyan-400/30">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 shrink-0 text-cyan-600" />
                <div className="flex-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-500"
                  >
                    Senha
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-6 border-0 bg-transparent p-0 text-base font-medium text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm font-medium text-red-600"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="group mt-2 h-14 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>

            {!adminMode && (
              <p className="pt-2 text-center text-sm text-slate-700">
                Ainda não tem conta?{' '}
                <Link
                  to={`/empresa/${slug}/register`}
                  className="font-semibold text-cyan-600 transition-colors hover:text-cyan-700 hover:underline"
                >
                  Criar conta
                </Link>
              </p>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {branding.name || 'WashSync'}
        </p>
      </motion.div>
    </div>
  );
}