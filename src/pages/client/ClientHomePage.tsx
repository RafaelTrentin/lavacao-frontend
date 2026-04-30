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
  Bell, CalendarPlus, CalendarDays, Sparkles, Smartphone,
  BellRing, ChevronRight, CheckCircle2, Clock,
} from 'lucide-react';

// helper local (mantido no arquivo, como no original)
function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)');
  // @ts-ignore - iOS Safari
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mql?.matches) || iosStandalone;
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

  // Verificação completa do status do Push
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
    return () => { cancelled = true; };
  }, []);

  // beforeinstallprompt / appinstalled
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
    if (!deferredPrompt) return;
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
  ((profileData as any)?.name || (user as any)?.name || 'Cliente')
    .split(' ')[0];

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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
          <div className="relative px-5 pt-8 pb-10 md:px-10 md:pt-12 max-w-5xl mx-auto">
            <Badge variant="secondary" className="gap-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Bem-vindo de volta
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Olá, {firstName} 👋
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Pronto para deixar seu carro impecável? Agende em segundos.
            </p>
          </div>
        </motion.section>

        <div className="px-5 md:px-10 max-w-5xl mx-auto pb-12 space-y-6">
          {/* AÇÕES RÁPIDAS */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Link to={`${basePath}/new-appointment`} className="group">
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <CalendarPlus className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider opacity-80">Ação principal</p>
                    <p className="text-lg font-semibold">Novo agendamento</p>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>

            <Link to={`${basePath}/my-appointments`} className="group">
              <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Histórico</p>
                    <p className="text-lg font-semibold">Meus agendamentos</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </motion.section>

          {/* BANNER INSTALAR APP */}
          {showInstallBanner && !isStandaloneMode() && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Instale o app</p>
                    <p className="text-sm text-muted-foreground">Acesso rápido direto da sua tela inicial.</p>
                  </div>
                  <Button onClick={handleInstallApp} size="sm">Instalar</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* BANNER ATIVAR PUSH */}
          {!checkingPushStatus && !pushEnabled && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <BellRing className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Ative as notificações</p>
                    <p className="text-sm text-muted-foreground">Receba lembretes e atualizações dos seus agendamentos.</p>
                  </div>
                  <Button onClick={handleEnablePush} disabled={enablingPush} size="sm" variant="outline">
                    {enablingPush ? 'Ativando...' : 'Ativar'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CENTRO DE NOTIFICAÇÕES */}
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">Notificações</p>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
                      </p>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="rounded-full">{unreadCount}</Badge>
                  )}
                </div>

                <Separator className="mb-4" />

                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {notifications.slice(0, 3).map((item: any) => (
                      <li
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          item.isRead ? 'border-border/40 bg-background' : 'border-primary/30 bg-primary/5'
                        }`}
                      >
                        <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          item.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
                        }`}>
                          {item.isRead ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || 'Notificação'}</p>
                            {(item.message || item.body) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {item.message || item.body}
                          </p>
                            )}
                        </div>
                        {!item.isRead && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </ClientLayout>
  );
}
