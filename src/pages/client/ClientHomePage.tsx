import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import ClientLayout from '@/components/layouts/ClientLayout';
import { useAuth } from '@/contexts/AuthContext';
import { enablePushNotifications } from '@/lib/push';
import { notificationsApi, customersApi } from '@/lib/api';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CalendarPlus,
  CalendarDays,
  Sparkles,
  Smartphone,
  BellRing,
  ChevronRight,
  CheckCircle2,
  Clock,
  Lightbulb,
} from 'lucide-react';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)');
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mql?.matches) || iosStandalone;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ClientHomePage() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const basePath = slug ? `/empresa/${slug}` : '';

  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(true);

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const { data: profileData } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: customersApi.getProfile,
  });

  const notifications: any[] =
    (notificationsData as any)?.notifications ?? (notificationsData as any) ?? [];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (!('PushManager' in window)) return;
        if (Notification.permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!cancelled) setPushEnabled(Boolean(subscription));
      } catch {
        // silencioso
      } finally {
        if (!cancelled) setCheckingPushStatus(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();

      if (isStandaloneMode()) return;

      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    const onInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
  if (!deferredPrompt) {
    toast.info(
      'No Android, toque no menu ⋮ do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".',
    );
    return;
  }

  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;

  if (choice.outcome === 'accepted') {
    setShowInstallBanner(false);
    setDeferredPrompt(null);
  }
};

  const handleEnablePush = async () => {
    try {
      setEnablingPush(true);

      await enablePushNotifications();

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setPushEnabled(Boolean(subscription));
      } catch {
        // ignora
      }

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notificações ativadas com sucesso');
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível ativar as notificações');
    } finally {
      setEnablingPush(false);
      setCheckingPushStatus(false);
    }
  };

  const firstName =
    ((profileData as any)?.name || (user as any)?.name || 'Cliente').split(' ')[0];

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />

          <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-8 md:px-10 md:pt-12">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Bem-vindo de volta
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Olá, {firstName} 👋
            </h1>

            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Pronto para deixar seu carro impecável? Agende em segundos.
            </p>
          </div>
        </motion.section>

        <div className="mx-auto max-w-5xl space-y-6 px-5 pb-12 md:px-10">
          {/* AÇÕES RÁPIDAS */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <Link to={`${basePath}/new-appointment`} className="group">
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <CalendarPlus className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider opacity-80">
                      Ação principal
                    </p>
                    <p className="text-lg font-semibold">Novo agendamento</p>
                  </div>

                  <ChevronRight className="h-5 w-5 opacity-80 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>

            <Link to={`${basePath}/my-appointments`} className="group">
              <Card className="h-full border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Histórico
                    </p>
                    <p className="text-lg font-semibold">Meus agendamentos</p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          </motion.section>

          {/* CARD: SERVIÇOS ESPECIAIS */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <Link to={`${basePath}/extras`} className="block">
              <Card className="group relative overflow-hidden border-border/60 bg-gradient-to-br from-amber-50 to-orange-50 transition-all hover:shadow-md dark:from-amber-950/20 dark:to-orange-950/20">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Serviços especiais
                    </h3>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      Conheça extras e tratamentos premium
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* BANNER INSTALAR APP */}
          {!isStandaloneMode() && (showInstallBanner || isAndroidDevice()) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Smartphone className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Instale o app</p>
                    <p className="text-sm text-muted-foreground">
                      Acesso rápido direto da sua tela inicial.
                    </p>
                  </div>

                  <Button onClick={handleInstallApp} size="sm">
                    Instalar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* BANNER ATIVAR PUSH */}
          {!checkingPushStatus && !pushEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <BellRing className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Ative as notificações</p>
                    <p className="text-sm text-muted-foreground">
                      Receba lembretes e atualizações dos seus agendamentos.
                    </p>
                  </div>

                  <Button
                    onClick={handleEnablePush}
                    disabled={enablingPush}
                    size="sm"
                    variant="outline"
                  >
                    {enablingPush ? 'Ativando...' : 'Ativar'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CENTRO DE NOTIFICAÇÕES */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="font-semibold leading-tight">Notificações</p>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount > 0
                          ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                          : 'Tudo em dia'}
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <Badge variant="default" className="rounded-full">
                      {unreadCount}
                    </Badge>
                  )}
                </div>

                <Separator className="mb-4" />

                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Nenhuma notificação por enquanto.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {notifications.slice(0, 3).map((item: any) => (
                      <li
                        key={item.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                          item.isRead
                            ? 'border-border/40 bg-background'
                            : 'border-primary/30 bg-primary/5'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            item.isRead
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {item.isRead ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title || 'Notificação'}
                          </p>

                          {(item.message || item.body) && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {item.message || item.body}
                            </p>
                          )}
                        </div>

                        {!item.isRead && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.section>

          {/* CARD: DICA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
          >
            <Card className="border-dashed border-border/70 bg-muted/30">
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Lightbulb className="h-4 w-4" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Dica</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Agende com antecedência para garantir o melhor horário e evitar
                    a espera nos finais de semana.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </ClientLayout>
  );
}