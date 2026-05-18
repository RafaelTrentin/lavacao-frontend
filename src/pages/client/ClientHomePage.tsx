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

function isNativeCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;

  const capacitor = (window as any).Capacitor;
  const isCapacitorNative =
    typeof capacitor?.isNativePlatform === 'function' &&
    capacitor.isNativePlatform();

  return (
    Boolean(isCapacitorNative) ||
    window.location.protocol === 'capacitor:' ||
    window.location.origin === 'https://localhost'
  );
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

      if (isStandaloneMode() || isNativeCapacitorApp()) return;

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

  const shouldShowInstallBanner =
    !isNativeCapacitorApp() &&
    !isStandaloneMode() &&
    (showInstallBanner || isAndroidDevice());

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#f7f8fb]">
        <div className="mx-auto max-w-5xl px-5 pb-24 pt-5 md:px-10 md:pt-8">
          {/* HERO LIMPO */}
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-5"
          >
            <div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
              <Badge
                variant="secondary"
                className="mb-3 gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Bem-vindo de volta
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Olá, {firstName} 👋
              </h1>

              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 md:text-base">
                Agende, acompanhe seus horários e veja os serviços disponíveis
                em poucos toques.
              </p>
            </div>
          </motion.section>

          <div className="space-y-4">
            {/* AÇÕES PRINCIPAIS */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <Link to={`${basePath}/new-appointment`} className="group">
                <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <CalendarPlus className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                        Principal
                      </p>
                      <p className="mt-0.5 text-lg font-semibold">
                        Novo agendamento
                      </p>
                      <p className="mt-0.5 text-xs text-white/55">
                        Reserve seu horário
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-white/55 transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>

              <Link to={`${basePath}/my-appointments`} className="group">
                <Card className="h-full border-0 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                      <CalendarDays className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Histórico
                      </p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-950">
                        Meus agendamentos
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Status e horários
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            </motion.section>

            {/* SERVIÇOS ESPECIAIS */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <Link to={`${basePath}/extras`} className="group block">
                <Card className="border border-amber-100 bg-amber-50/70 shadow-sm transition-all hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-950">
                        Serviços especiais
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">
                        Extras e tratamentos premium
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* CONFIGURAÇÕES / AVISOS */}
            {(shouldShowInstallBanner ||
              (!checkingPushStatus && !pushEnabled)) && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="space-y-3"
              >
                {shouldShowInstallBanner && (
                  <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Smartphone className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">
                          Instale o app
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-500">
                          Acesso rápido direto da tela inicial.
                        </p>
                      </div>

                      <Button
                        onClick={handleInstallApp}
                        size="sm"
                        className="h-9 rounded-xl bg-slate-950 px-4 text-xs text-white hover:bg-slate-800"
                      >
                        Instalar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!checkingPushStatus && !pushEnabled && (
                  <Card className="border border-amber-100 bg-white shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <BellRing className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">
                          Ative notificações
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-500">
                          Receba lembretes e atualizações.
                        </p>
                      </div>

                      <Button
                        onClick={handleEnablePush}
                        disabled={enablingPush}
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl px-4 text-xs"
                      >
                        {enablingPush ? 'Ativando...' : 'Ativar'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.section>
            )}

            {/* NOTIFICAÇÕES */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Bell className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold leading-tight text-slate-950">
                          Notificações
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                            : 'Tudo em dia'}
                        </p>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <Badge className="rounded-full bg-slate-950 text-white hover:bg-slate-950">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Bell className="h-5 w-5 text-slate-400" />
                      </div>

                      <p className="text-sm text-slate-500">
                        Nenhuma notificação por enquanto.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {notifications.slice(0, 3).map((item: any) => (
                        <li
                          key={item.id}
                          className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
                            item.isRead
                              ? 'border-slate-100 bg-slate-50/60'
                              : 'border-primary/20 bg-primary/5'
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              item.isRead
                                ? 'bg-white text-slate-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {item.isRead ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-950">
                              {item.title || 'Notificação'}
                            </p>

                            {(item.message || item.body) && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
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

            {/* DICA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
            >
              <Card className="border border-dashed border-slate-200 bg-white/70 shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Lightbulb className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-950">Dica</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      Agende com antecedência para garantir o melhor horário e
                      evitar a espera nos finais de semana.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}