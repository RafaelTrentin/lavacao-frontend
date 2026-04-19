import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

import ClientLayout from '@/components/layouts/ClientLayout';
import { Button } from '@/components/ui/button';
import { notificationsApi } from '@/lib/api';
import type { NotificationItem } from '@/types';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({
        queryKey: ['notifications-unread-count'],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({
        queryKey: ['notifications-unread-count'],
      });
    },
  });

  return (
    <ClientLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe atualizações dos seus agendamentos
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || notifications.length === 0}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item: NotificationItem) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!item.isRead) markReadMutation.mutate(item.id);
                }}
                className={`w-full rounded-2xl border p-4 text-left shadow-card ${
                  item.isRead
                    ? 'border-border bg-card'
                    : 'border-primary/20 bg-primary/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.message}
                    </p>
                  </div>

                  {!item.isRead && (
                    <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
                      Nova
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}