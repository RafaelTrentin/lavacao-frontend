import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Droplets, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const branding = JSON.parse(localStorage.getItem('branding') || '{}');
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { slug } = useParams();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Informe seu nome');
      return;
    }

    if (!form.phone.trim()) {
      setError('Informe seu telefone');
      return;
    }

    if (!form.email.trim()) {
      setError('Informe seu email');
      return;
    }

    if (form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'CUSTOMER',
        businessSlug: slug || '',
      });

      navigate(`/empresa/${slug}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar conta');
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
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-elevated ${
              branding.logoUrl ? 'bg-transparent' : 'gradient-primary'
            }`}
          >
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <Droplets className="h-7 w-7 text-primary-foreground" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {branding.name || 'WashSync'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua conta para agendar
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Seu nome"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Telefone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(49) 99999-9999"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirmar senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link
                to={`/empresa/${slug}/login`}
                className="font-medium text-primary hover:underline"
              >
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}