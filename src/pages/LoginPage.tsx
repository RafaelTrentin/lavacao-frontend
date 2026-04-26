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

      await sleep(50);

      const savedUser = getStoredUser();
      const savedSlug =
        localStorage.getItem('washsync_business_slug') || businessSlug || slug;

      if (savedUser?.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (savedSlug) {
        navigate(`/empresa/${savedSlug}`, { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-cyan-50 via-white to-sky-100 px-4 py-10">
      {/* Gotas decorativas no fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[8%] top-[10%] h-8 w-8 rounded-full bg-gradient-to-br from-white to-sky-200/50 ring-1 ring-white shadow-lg shadow-sky-200/40"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[10%] top-[18%] h-6 w-6 rounded-full bg-gradient-to-br from-white to-sky-200/40 ring-1 ring-white shadow-md"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute left-[12%] top-[55%] h-10 w-10 rounded-full bg-gradient-to-br from-white to-sky-200/40 ring-1 ring-white shadow-lg"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-[15%] right-[8%] h-12 w-12 rounded-full bg-gradient-to-br from-white to-sky-200/40 ring-1 ring-white shadow-lg"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute bottom-[25%] left-[6%] h-5 w-5 rounded-full bg-gradient-to-br from-white to-sky-200/40 ring-1 ring-white"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card glassmorphism */}
        <div className="rounded-3xl border border-white/60 bg-white/40 p-7 shadow-2xl shadow-sky-200/40 backdrop-blur-xl sm:p-8">
          {/* Logo + título */}
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-3 flex h-24 w-24 items-center justify-center"
            >
              <img
                src={branding.logoUrl || '/WashSync-Logo.png'}
                alt={branding.name || 'WashSync'}
                className="h-full w-full object-contain drop-shadow-md"
              />
            </motion.div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {branding.name || 'WashSync'}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Sistema de Gestão para Lava-Jatos
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Faça login para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email com label flutuante */}
            <div className="group relative rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 shadow-sm transition-all focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/30">
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

            {/* Input Senha com label flutuante */}
            <div className="group relative rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 shadow-sm transition-all focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/30">
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
                className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2.5 text-sm font-medium text-red-600"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="group h-12 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]"
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
              <p className="pt-1 text-center text-sm text-slate-600">
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
