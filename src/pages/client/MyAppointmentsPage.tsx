import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ClientLayout from '@/components/layouts/ClientLayout';
import { appointmentsApi } from '@/lib/api';
import type { Appointment } from '@/types';
import { CalendarDays, Clock, Loader2, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmado', className: 'bg-success/10 text-success' },
  IN_PROGRESS: { label: 'Em andamento', className: 'bg-primary/10 text-primary' },
  COMPLETED: { label: 'Concluído', className: 'bg-muted text-muted-foreground' },
  CANCELLED: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive' },
  NO_SHOW: { label: 'Não compareceu', className: 'bg-warning/10 text-warning' },
};

const VEHICLE_LABELS: Record<string, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
};

function getVehicleLabel(vehicleType: string) {
  if (!vehicleType) return 'Veículo';

  return VEHICLE_LABELS[vehicleType] || vehicleType;
}

export default function MyAppointmentsPage() {
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: appointmentsApi.myList,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: () => toast.error('Erro ao cancelar'),
  });

  return (
    <ClientLayout>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-foreground">Meus Agendamentos</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt: Appointment, i: number) => {
              const status = STATUS_MAP[apt.status] || STATUS_MAP.CONFIRMED;
              const canCancel = ['CONFIRMED'].includes(apt.status);

              const startDate = new Date(apt.scheduledStartAt);
              const endDate = new Date(apt.scheduledEndAt);

              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {apt.snapshotServiceModeName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getVehicleLabel(apt.vehicleType)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{apt.bookingNumber}
                      </p>
                      {apt.willSearchVehicle && (
                        <p className="mt-1 text-xs font-medium text-primary">
                          🚗 Busca e entrega
                        </p>
                      )}
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(startDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">
                      {(Number(apt.snapshotTotalPriceInCents) / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      })}
                    </span>

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelMutation.mutate(apt.id)}
                        disabled={cancelMutation.isPending}
                        className="text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}