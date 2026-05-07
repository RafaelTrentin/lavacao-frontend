import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { publicBusinessApi } from '@/lib/api';

function normalizeBusinessCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/empresa\//, '')
    .replace(/^\/?empresa\//, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function AppSelectBusinessPage() {
  const navigate = useNavigate();

  const [businessCode, setBusinessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedSlug = normalizeBusinessCode(businessCode);

  const handleContinue = async () => {
    if (!normalizedSlug || loading) return;

    try {
      setLoading(true);

      await publicBusinessApi.getBySlug(normalizedSlug);

      localStorage.setItem('washsync_business_slug', normalizedSlug);

      navigate(`/empresa/${normalizedSlug}`, { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Não encontramos essa lavação. Confira o código e tente novamente.';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-border shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3 text-center">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              WashSync
            </Badge>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Acesse sua lavação
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Informe o código ou cole o link enviado pela lavação.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Código ou link da lavação
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={businessCode}
                onChange={(event) => setBusinessCode(event.target.value)}
                placeholder="ex: center-estetica-automotiva"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-12 pl-9"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleContinue();
                  }
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Você pode digitar apenas o código ou colar o link completo da
              lavação.
            </p>

            {normalizedSlug && (
              <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Código identificado:{' '}
                <span className="font-medium text-foreground">
                  {normalizedSlug}
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={handleContinue}
            disabled={!normalizedSlug || loading}
            className="h-12 w-full rounded-xl font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}