import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/40 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden"
          >
            <img
              src={branding.logoUrl || '/WashSync-Logo.png'}
              alt={branding.name || 'WashSync'}
              className="h-full w-full object-contain"
            />
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {branding.name || 'WashSync'}
          </h1>
          <p className="mt-2 rounded bg-red-500 px-3 py-1 text-xs font-bold text-white">
  TESTE LOGIN NOVO
</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Faça login para continuar na sua conta
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-7 shadow-xl backdrop-blur-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-12 rounded-xl border-border/70 bg-background/60 pl-10 text-base transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl border-border/70 bg-background/60 pl-10 text-base transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="group h-12 w-full rounded-xl gradient-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
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
              <p className="pt-1 text-center text-sm text-muted-foreground">
                Ainda não tem conta?{' '}
                <Link
                  to={`/empresa/${slug}/register`}
                  className="font-semibold text-primary transition-colors hover:underline"
                >
                  Criar conta
                </Link>
              </p>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {branding.name || 'WashSync'} — Todos os
          direitos reservados
        </p>
      </motion.div>
    </div>
  );
}