
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passwordRecoveryApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const { slug } = useParams<{ slug: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug || loading) return;

    setLoading(true);
    setError('');

    try {
      await passwordRecoveryApi.forgotPassword(
        email.trim().toLowerCase(),
        slug,
      );
      setSent(true);
    } catch {
      setError(
        'Não foi possível processar a solicitação. Tente novamente mais tarde.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-100 via-sky-50 to-blue-200 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/60 p-8 shadow-2xl shadow-sky-300/30 backdrop-blur-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/WashSync-Logo.png"
            alt="WashSync"
            className="mb-4 h-24 w-24 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-900">
            Recuperar senha
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            {sent
              ? 'Confira sua caixa de entrada.'
              : 'Informe seu e-mail cadastrado para receber um link de redefinição.'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-5 text-center">
              <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-cyan-600" />
              <p className="text-sm text-slate-700">
                Se existir uma conta vinculada a este e-mail,
                você receberá instruções para redefinir sua senha.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                O link será válido por 30 minutos.
                Verifique também sua pasta de spam.
              </p>
            </div>

            <Link
              to={`/empresa/${slug}/login`}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="recovery-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                E-mail cadastrado
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4">
                <Mail className="h-5 w-5 text-cyan-600" />
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                  maxLength={254}
                  className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !slug}
              className="h-14 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>

            <Link
              to={`/empresa/${slug}/login`}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
