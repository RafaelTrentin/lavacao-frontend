import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AppEntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const storedSlug = localStorage.getItem('washsync_business_slug');

    if (storedSlug) {
      navigate(`/empresa/${storedSlug}`, { replace: true });
      return;
    }

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
            Carregando WashSync
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estamos preparando seu acesso.
          </p>
        </div>
      </div>
    </div>
  );
}