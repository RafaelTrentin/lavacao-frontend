// src/pages/ClientExtrasPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  MessageCircle,
  ArrowRight,
  X,
  Image as ImageIcon,
  Info,
} from 'lucide-react';

import ClientLayout from '@/components/layouts/ClientLayout';
import { extraServicesApi, adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ExtraService } from '@/types';

export default function ClientExtrasPage() {
  const [selectedExtra, setSelectedExtra] = useState<ExtraService | null>(null);

  const { data: extras = [], isLoading } = useQuery({
    queryKey: ['extras-client'],
    queryFn: extraServicesApi.list,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: adminApi.getBusinessSettings,
  });

  const whatsapp = settings?.whatsappPhone || '';

  const openWhatsApp = (extraName: string) => {
    if (!whatsapp) return;

    const phone = String(whatsapp).replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no serviço: ${extraName}`,
    );

    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Cabeçalho premium */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative space-y-2">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Serviços especiais
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Extras para seu veículo
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Serviços sob consulta atendidos diretamente pela lavação via
              WhatsApp. Toque em um serviço para ver mais detalhes.
            </p>
          </div>
        </motion.div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="h-44 w-full animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
            <div className="col-span-full flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </div>
        ) : extras.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Nenhum serviço extra disponível
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Em breve a lavação poderá disponibilizar novos serviços
              especiais aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {extras.map((extra) => (
              <motion.button
                key={extra.id}
                type="button"
                onClick={() => setSelectedExtra(extra)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="relative">
                  {extra.imageUrl ? (
                    <img
                      src={extra.imageUrl}
                      alt={extra.name}
                      className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/70" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  <Badge
                    variant="secondary"
                    className="absolute left-3 top-3 gap-1 bg-background/90 backdrop-blur"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    Extra
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">
                      {extra.name}
                    </h3>
                    {extra.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {extra.description}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Ver detalhes
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Modal / Bottom sheet */}
      <AnimatePresence>
        {selectedExtra && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExtra(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-xl sm:w-[95vw] sm:rounded-3xl"
            >
              {/* Handle do bottom sheet (mobile) */}
              <div className="shrink-0 bg-card pt-2 sm:hidden">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Área scrollável */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="relative">
                  {selectedExtra.imageUrl ? (
                    <img
                      src={selectedExtra.imageUrl}
                      alt={selectedExtra.name}
                      className="h-56 w-full object-cover sm:h-64"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-gradient-to-br from-muted to-muted/40 sm:h-64">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/70" />
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setSelectedExtra(null)}
                    className="absolute right-3 top-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <Badge
                    variant="secondary"
                    className="absolute left-3 top-3 gap-1 bg-background/90 backdrop-blur"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    Serviço especial
                  </Badge>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {selectedExtra.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Atendimento personalizado via WhatsApp
                    </p>
                  </div>

                  <Separator />

                  <div className="rounded-2xl bg-muted/50 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {selectedExtra.description || 'Sem descrição informada.'}
                    </p>
                  </div>

                  {!settings?.whatsappPhone && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>WhatsApp não configurado pela lavação.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer fixo com WhatsApp sempre visível */}
              <div className="shrink-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedExtra(null)}
                    className="h-12 shrink-0"
                  >
                    Fechar
                  </Button>

                  <Button
                    onClick={() => openWhatsApp(selectedExtra.name)}
                    disabled={!settings?.whatsappPhone}
                    className="h-12 flex-1 bg-green-600 font-semibold text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Solicitar via WhatsApp
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientLayout>
  );
}