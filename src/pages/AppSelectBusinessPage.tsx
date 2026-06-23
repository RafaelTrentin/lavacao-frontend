import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  publicBusinessApi,
  type PublicBusinessSummary,
} from '@/lib/api';
import { cn } from '@/lib/utils';

function normalizeBusinessCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/empresa\//, '')
    .replace(/^\/?empresa\//, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function getSearchTerm(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return '';

  const looksLikeLink =
    trimmed.includes('/empresa/') || trimmed.startsWith('http');

  if (looksLikeLink) {
    return normalizeBusinessCode(trimmed);
  }

  return trimmed;
}

function saveBusinessContext(business: PublicBusinessSummary) {
  localStorage.setItem('washsync_business_slug', business.slug);

  localStorage.setItem(
    'branding',
    JSON.stringify({
      name: business.name,
      logoUrl: business.logoUrl || null,
      iconUrl: business.iconUrl || null,
      primaryColor: business.primaryColor || '#0066CC',
      secondaryColor: business.secondaryColor || '#FF6B35',
      accentColor: business.accentColor || '#00D4FF',
    }),
  );
}

export default function AppSelectBusinessPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PublicBusinessSummary[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState<PublicBusinessSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTerm = useMemo(() => getSearchTerm(search), [search]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setSelectedBusiness(null);
      setHasSearched(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setHasSearched(true);

        const data = await publicBusinessApi.search(searchTerm);

        setResults(data);

        setSelectedBusiness((current) => {
          if (!current) return null;
          return data.some((item) => item.id === current.id) ? current : null;
        });
      } catch {
        setResults([]);
        toast.error('Não foi possível buscar lavações agora.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const handleContinue = (business = selectedBusiness) => {
    if (!business) {
      toast.error('Selecione uma lavação para continuar');
      return;
    }

    saveBusinessContext(business);

    navigate(`/empresa/${business.slug}/login`, { replace: true });
  };

  const handleSubmit = () => {
    if (selectedBusiness) {
      handleContinue(selectedBusiness);
      return;
    }

    if (results.length === 1) {
      handleContinue(results[0]);
      return;
    }

    if (!searchTerm || searchTerm.length < 2) {
      toast.error('Digite o nome, cidade ou código da lavação');
      return;
    }

    toast.error('Selecione uma lavação da lista para continuar');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-100 via-sky-50 to-blue-100 px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-white/70 bg-white/75 shadow-2xl shadow-sky-200/50 backdrop-blur-xl">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3 text-center">
            <Badge variant="secondary" className="gap-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              WashSync
            </Badge>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm">
              <Building2 className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Encontre sua lavação
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Busque pelo nome, cidade ou pelo código informado pela lavação.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Buscar lavação
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex: Center, Maravilha ou código"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-12 rounded-2xl bg-white/80 pl-9"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Também funciona colando o link enviado pela lavação.
            </p>
          </div>

          <div className="min-h-[120px] space-y-2">
            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando lavações...
              </div>
            )}

            {!loading &&
              results.map((business) => {
                const isSelected = selectedBusiness?.id === business.id;

                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => setSelectedBusiness(business)}
                    onDoubleClick={() => handleContinue(business)}
                    className={cn(
                      'w-full rounded-2xl border p-3 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/15'
                        : 'border-border bg-white/70 hover:border-primary/40 hover:bg-white',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
                        {business.logoUrl ? (
                          <img
                            src={business.logoUrl}
                            alt={business.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {business.name}
                        </p>

                        {(business.city || business.state) && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[business.city, business.state]
                              .filter(Boolean)
                              .join(' - ')}
                          </p>
                        )}

                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          Código: {business.slug}
                        </p>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}

            {!loading && hasSearched && results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-white/60 p-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  Nenhuma lavação encontrada
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Confira o nome, cidade ou código informado pela lavação e tente novamente.
                </p>
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="rounded-2xl border border-border bg-white/50 p-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  Comece digitando para buscar
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Após selecionar a lavação, você poderá entrar ou criar sua conta.
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedBusiness && results.length !== 1}
            className="h-12 w-full rounded-2xl font-semibold"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            A lavação selecionada ficará salva neste aparelho. Você poderá trocar depois no menu do app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}