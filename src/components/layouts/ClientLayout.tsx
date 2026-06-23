import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  CalendarPlus,
  CalendarDays,
  User,
  LogOut,
  Droplets,
  Sparkles,
  Bell,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = JSON.parse(localStorage.getItem('branding') || '{}');
  const { logout, businessSlug } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();

  const effectiveSlug = slug || businessSlug || '';
  const basePath = effectiveSlug ? `/empresa/${effectiveSlug}` : '';

  const navItems = [
    { path: `${basePath}`, label: 'Início', icon: Home },
    { path: `${basePath}/new-appointment`, label: 'Agendar', icon: CalendarPlus },
    { path: `${basePath}/my-appointments`, label: 'Agendamentos', icon: CalendarDays },
    { path: `${basePath}/extras`, label: 'Extras', icon: Sparkles },
    { path: `${basePath}/profile`, label: 'Perfil', icon: User },
  ];

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    logout();
    navigate(effectiveSlug ? `/empresa/${effectiveSlug}/login` : '/admin/login');
  };

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {/* HEADER */}
      <header className="shrink-0 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
                branding.logoUrl ? 'bg-transparent' : 'gradient-primary'
              }`}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <Droplets className="h-4 w-4 text-primary-foreground" />
              )}
            </div>

            <span className="truncate text-base font-bold tracking-tight text-foreground">
              {branding.name || 'WashSync'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to={`${basePath}/notifications`}
              aria-label="Notificações"
              className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
            >
              <Bell className="h-5 w-5" />
              {(unreadData?.count || 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadData!.count > 9 ? '9+' : unreadData!.count}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair"
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO ROLÁVEL */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f8fb]">
        <div className="mx-auto w-full max-w-lg px-4 py-5 pb-8">
          {children}
        </div>
      </main>

      {/* MENU INFERIOR */}
      <nav className="shrink-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-lg grid-cols-5 items-center px-2 py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 transition-colors active:bg-muted ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}