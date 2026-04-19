import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarPlus,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi, customersApi } from '@/lib/api';
import { enablePushNotifications } from '@/lib/push';
import { toast } from 'sonner';

export default function ClientHomePage() {
  const { user } = useAuth();
  const { slug } = useParams();

  const [checkingPushStatus, setCheckingPushStatus] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const basePath = slug ? `/empresa/${slug}` : '';

  const quickActions = [
    {
      path: `${basePath}/new-appointment`,
      label: 'Novo Agendamento',
      desc: 'Agende sua lavagem',
      icon: CalendarPlus,
    },
    {
      path: `${basePath}/my-appointments`,
      label: 'Meus Agendamentos',
      desc: 'Veja seu histórico',
      icon: CalendarDays,
    },
  ];

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
  });

  const { data: profile } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: customersApi.getProfile,
  });

  useEffect(() => {
    async function checkPushStatus() {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setPushEnabled(false);
          return;
        }

        if (Notification.permission !== 'granted') {
          setPushEnabled(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setPushEnabled(!!subscription);
      } catch {
        setPushEnabled(false);
      } finally {
        setCheckingPushStatus(false);
      }
    }

    checkPushStatus();
  }, []);

  const handleEnablePush = async () => {
    try {
      setEnablingPush(true);
      await enablePushNotifications();
      setPushEnabled(true);
      toast.success('Notificações ativadas com sucesso');
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível ativar as notificações');
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <ClientLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {(profile?.name || user?.name || 'Cliente').split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que deseja fazer hoje?
          </p>
        </div>

        {!checkingPushStatus && !pushEnabled && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Ative os alertas do celular
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receba aviso quando seu agendamento for reagendado, cancelado
                  ou entrar em atendimento.
                </p>

                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enablingPush ? 'Ativando...' : 'Ativar notificações'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {quickActions.map((action, i) => (
            <Link key={action.path} to={action.path}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 rounded-2xl border border-border p-4 shadow-card transition-shadow hover:shadow-elevated ${
                  i === 0
                    ? 'gradient-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    i === 0 ? 'bg-primary-foreground/20' : 'bg-primary/10'
                  }`}
                >
                  <action.icon
                    className={`h-6 w-6 ${
                      i === 0 ? 'text-primary-foreground' : 'text-primary'
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      i === 0 ? '' : 'text-foreground'
                    }`}
                  >
                    {action.label}
                  </p>
                  <p
                    className={`text-sm ${
                      i === 0
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {action.desc}
                  </p>
                </div>

                <ArrowRight
                  className={`h-5 w-5 ${
                    i === 0
                      ? 'text-primary-foreground/60'
                      : 'text-muted-foreground'
                  }`}
                />
              </motion.div>
            </Link>
          ))}
        </div>

        <Link to={`${basePath}/extras`}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-elevated"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Serviços especiais
              </p>
              <p className="text-sm text-muted-foreground">
                Veja outros serviços disponíveis sob consulta
              </p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </Link>

        {notifications.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Últimas notificações
                </h3>
              </div>

              <Link
                to={`${basePath}/notifications`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {notifications.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.isRead
                      ? 'border-border bg-background'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Dica</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Agende sua lavagem com antecedência e garanta o melhor horário.
            Alguns serviços especiais são atendidos separadamente e podem ser
            consultados na área de extras.
          </p>
        </div>
      </motion.div>
    </ClientLayout>
  );
}