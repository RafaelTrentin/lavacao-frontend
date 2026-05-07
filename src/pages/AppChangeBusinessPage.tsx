import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AppChangeBusinessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('washsync_token');
    localStorage.removeItem('washsync_user');
    localStorage.removeItem('washsync_business_slug');
    localStorage.removeItem('branding');

    navigate('/app/selecionar-empresa', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>

        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Preparando troca de lavação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Limpando o acesso atual para escolher uma nova lavação.
          </p>
        </div>
      </div>
    </div>
  );
}