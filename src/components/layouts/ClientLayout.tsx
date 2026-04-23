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
    <div className="app-shell flex flex-col bg-background">
      <header className="safe-area-top shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ${
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

            <span className="text-lg font-bold tracking-tight text-foreground">
              {branding.name || 'WashHub'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`${basePath}/notifications`}
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <Bell className="h-4.5 w-4.5" />
              {(unreadData?.count || 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadData!.count > 9 ? '9+' : unreadData!.count}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="app-scroll min-h-0 flex-1">
        <div className="mx-auto w-full max-w-lg px-4 py-5">
          {children}
        </div>
      </main>

      <nav className="safe-area-bottom shrink-0 border-t border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}