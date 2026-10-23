
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passwordRecoveryApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 10 || password.length > 128) {
      setError('A senha deve conter de 10 a 128 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas informadas não coincidem.');
      return;
    }

    if (!token || loading) return;

    setLoading(true);

    try {
      await passwordRecoveryApi.resetPassword(token, password);
      setSuccess(true);
      setPassword('');
      setConfirmation('');
      window.history.replaceState(
        window.history.state,
        '',
        '/redefinir-senha',
      );
    } catch {
      setError(
        'O link é inválido, expirou ou já foi utilizado. Solicite um novo link pela tela de login.',
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
            Redefinir senha
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            {success
              ? 'Sua senha foi atualizada com sucesso.'
              : 'Crie uma nova senha para sua conta WashSync.'}
          </p>
        </div>

        {success ? (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />

            <p className="text-sm text-slate-700">
              Sua nova senha já pode ser utilizada.
              Volte ao aplicativo, selecione sua lavação e faça login.
            </p>

            <Link
              to="/app/selecionar-empresa"
              className="flex items-center justify-center gap-2 font-semibold text-cyan-700"
            >
              Ir para o WashSync
            </Link>
          </div>
        ) : !token ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-red-600">
              Link de recuperação ausente ou inválido.
            </p>

            <Link
              to="/app/selecionar-empresa"
              className="font-semibold text-cyan-700"
            >
              Voltar ao WashSync
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
                Nova senha
              </label>
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4">
                <LockKeyhole className="h-5 w-5 text-cyan-600" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
                Confirmar nova senha
              </label>
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4">
                <LockKeyhole className="h-5 w-5 text-cyan-600" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Utilize uma senha de 10 a 128 caracteres.
            </p>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar nova senha'}
            </Button>

            <Link
              to="/app/selecionar-empresa"
              className="flex items-center justify-center gap-2 text-sm text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao WashSync
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
