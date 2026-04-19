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
} from 'lucide-react';

import ClientLayout from '@/components/layouts/ClientLayout';
import { extraServicesApi, adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Serviços Extras
          </h1>
          <p className="text-sm text-muted-foreground">
            Serviços especiais disponíveis sob consulta
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : extras.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum serviço disponível</p>
          </div>
        ) : (
          <div className="space-y-3">
            {extras.map((extra) => (
              <button
                key={extra.id}
                type="button"
                onClick={() => setSelectedExtra(extra)}
                className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition-all hover:border-primary/30 hover:shadow-elevated"
              >
                {extra.imageUrl ? (
                  <img
                    src={extra.imageUrl}
                    alt={extra.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {extra.name}
                    </h3>
                    {extra.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {extra.description}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedExtra && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExtra(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-card"
            >
              {selectedExtra.imageUrl ? (
                <img
                  src={selectedExtra.imageUrl}
                  alt={selectedExtra.name}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedExtra.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Serviço atendido externamente via WhatsApp
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedExtra(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedExtra.description || 'Sem descrição informada.'}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => openWhatsApp(selectedExtra.name)}
                    disabled={!settings?.whatsappPhone}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedExtra(null)}
                  >
                    Fechar
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