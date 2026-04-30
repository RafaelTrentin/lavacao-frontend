import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ClientLayout from '@/components/layouts/ClientLayout';
import { appointmentsApi } from '@/lib/api';
import type { Appointment } from '@/types';
import {
  CalendarDays,
  Clock,
  Loader2,
  Ban,
  Calendar,
  Car,
  CheckCircle2,
  CircleAlert,
  Hash,
  MapPin,
  Plus,
  Sparkles,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// ----------------------------------------------------------------------------
// Labels e helpers (restaurados do original)
// ----------------------------------------------------------------------------

const VEHICLE_LABELS: Record<string, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  TRUCK: 'Caminhão',
  VAN: 'Van',
  SUV: 'SUV',
  PICKUP: 'Picape',
};

function getVehicleLabel(kind?: string | null) {
  if (!kind) return 'Veículo';
  return VEHICLE_LABELS[kind] ?? kind;
}

// ----------------------------------------------------------------------------
// Status (apresentação)
// ----------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

const STATUS_STYLES: Record<
  string,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CONFIRMED: {
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    icon: Sparkles,
  },
  COMPLETED: {
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: CheckCircle2,
  },
  CANCELLED: {
    className: 'bg-red-500/10 text-red-700 border-red-500/20',
    icon: Ban,
  },
  NO_SHOW: {
    className: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    icon: CircleAlert,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? {
    className: 'bg-muted text-muted-foreground border-border',
    icon: CircleAlert,
  };
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        cfg.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function formatPrice(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// ----------------------------------------------------------------------------
// Página
// ----------------------------------------------------------------------------

export default function MyAppointmentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentsApi.myList(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: () => {
      toast.error('Não foi possível cancelar o agendamento');
    },
  });

  const newAppointmentTo = slug ? `/empresa/${slug}` : '/';

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header premium */}
          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                >
                  <CalendarDays className="h-3 w-3" />
                  Meus horários
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Meus agendamentos
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Acompanhe seus horários, status e serviços agendados.
                </p>
              </div>

              <Button asChild size="sm" className="hidden shrink-0 shadow-sm sm:inline-flex">
                <Link to={newAppointmentTo}>
                  <Plus className="h-4 w-4" />
                  Novo agendamento
                </Link>
              </Button>
            </div>

            <Button asChild size="sm" className="w-full shadow-sm sm:hidden">
              <Link to={newAppointmentTo}>
                <Plus className="h-4 w-4" />
                Novo agendamento
              </Link>
            </Button>
          </motion.header>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Carregando seus agendamentos...
              </p>
            </div>
          )}

          {/* Estado vazio */}
          {!isLoading && appointments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      Nenhum agendamento por aqui
                    </h3>
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                      Você ainda não tem horários marcados. Que tal agendar
                      sua primeira lavagem agora mesmo?
                    </p>
                  </div>
                  <Button asChild className="mt-2 shadow-sm">
                    <Link to={newAppointmentTo}>
                      <Plus className="h-4 w-4" />
                      Criar agendamento
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Lista */}
          {!isLoading && appointments.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {appointments.map((apt: Appointment, index: number) => {
                const start = apt.scheduledStartAt
                  ? new Date(apt.scheduledStartAt)
                  : null;
                const end = apt.scheduledEndAt
                  ? new Date(apt.scheduledEndAt)
                  : null;

                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                  >
                    <Card className="group relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md">
                      {/* Faixa superior decorativa */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

                      <CardContent className="space-y-4 p-5">
                        {/* Topo: serviço + status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <h3 className="truncate text-base font-semibold leading-tight">
                              {apt.snapshotServiceModeName ?? 'Serviço'}
                            </h3>
                            {apt.bookingNumber && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                <span className="font-mono">
                                  {apt.bookingNumber}
                                </span>
                              </div>
                            )}
                          </div>
                          <StatusBadge status={apt.status} />
                        </div>

                        {/* Veículo */}
                        {apt.vehicleType && (
                          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <Car className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {getVehicleLabel(apt.vehicleType)}
                            </span>
                          </div>
                        )}

                        {/* Data e horário em blocos */}
                        {start && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border/60 bg-card p-3">
                              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Data
                              </div>
                              <div className="text-sm font-semibold">
                                {format(start, "dd 'de' MMM", { locale: ptBR })}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {format(start, 'EEEE', { locale: ptBR })}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-card p-3">
                              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Horário
                              </div>
                              <div className="text-sm font-semibold">
                                {format(start, 'HH:mm')}
                                {end && ` – ${format(end, 'HH:mm')}`}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {format(start, 'yyyy')}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Busca e entrega */}
                        {apt.willSearchVehicle && (
                          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="space-y-0.5">
                              <p className="font-semibold text-primary">
                                Busca e entrega inclusas
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Vamos até você buscar o veículo.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Endereço (renderização segura) */}
                        {(apt as any).snapshotAddressLine && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-2">
                              {(apt as any).snapshotAddressLine}
                            </span>
                          </div>
                        )}

                        <Separator />

                        {/* Rodapé: valor + ações */}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Valor total
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {formatPrice(apt.snapshotTotalPriceInCents)}
                            </div>
                          </div>

                          {apt.status === 'CONFIRMED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-700 hover:bg-red-500/10 hover:text-red-700"
                              onClick={() => cancelMutation.mutate(apt.id)}
                              disabled={cancelMutation.isPending}
                            >
                              {cancelMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}