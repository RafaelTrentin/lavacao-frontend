import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
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

      // Pequena folga para Safari/iOS/PWA estabilizar localStorage + contexto
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
            <img
              src={branding.logoUrl || '/WashSync-Logo.png'}
              alt={branding.name || 'WashSync'}
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {branding.name || 'WashSync'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça login para continuar
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-11"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="h-11 w-full gradient-primary font-medium text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>

            {!adminMode && (
              <p className="text-center text-sm text-muted-foreground">
                Ainda não tem conta?{' '}
                <Link
                  to={`/empresa/${slug}/register`}
                  className="font-medium text-primary hover:underline"
                >
                  Criar conta
                </Link>
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}