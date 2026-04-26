import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight, Droplets, Sparkles } from 'lucide-react';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-700 px-4 py-10">
      {/* Bolhas decorativas animadas */}
      <motion.div
        className="pointer-events-none absolute left-[8%] top-[12%] h-16 w-16 rounded-full bg-gradient-to-br from-white/70 to-cyan-200/30 ring-1 ring-white/60 backdrop-blur-sm"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute right-[12%] top-[18%] h-10 w-10 rounded-full bg-gradient-to-br from-white/80 to-cyan-100/40 ring-1 ring-white/70 backdrop-blur-sm"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[18%] left-[14%] h-12 w-12 rounded-full bg-gradient-to-br from-white/60 to-cyan-200/30 ring-1 ring-white/50 backdrop-blur-sm"
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[12%] right-[10%] h-20 w-20 rounded-full bg-gradient-to-br from-white/60 to-cyan-200/30 ring-1 ring-white/50 backdrop-blur-sm"
        animate={{ y: [0, -22, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/30">
            <Droplets className="h-3.5 w-3.5" />
            Sistema de Gestão para Lava-Jatos
          </div>
        </div>

        <div className="rounded-3xl border border-white/40 bg-white/95 p-7 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Logo + título */}
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 shadow-lg shadow-blue-500/30"
            >
              <img
                src={branding.logoUrl || '/WashSync-Logo.png'}
                alt={branding.name || 'WashSync'}
                className="h-full w-full object-contain"
              />
            </motion.div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {branding.name || 'WashSync'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Faça login para continuar na sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-base transition-all focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-base transition-all focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="group h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98]"
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
              <p className="pt-1 text-center text-sm text-slate-500">
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

        {/* Tagline */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/90">
          <Sparkles className="h-3.5 w-3.5" />
          Brilho e tecnologia para o seu lava-jato
        </div>

        <p className="mt-3 text-center text-xs text-white/70">
          © {new Date().getFullYear()} {branding.name || 'WashSync'} — Todos os
          direitos reservados
        </p>
      </motion.div>
    </div>
  );
}