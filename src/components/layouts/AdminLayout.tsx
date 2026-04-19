import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Users,
  Sparkles,
  LogOut,
  Menu,
  X,
  Droplets,
  SlidersHorizontal,
  Car,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import path from 'path';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/schedule', label: 'Agenda', icon: Calendar },
  { path: '/admin/service-modes', label: 'Modalidades', icon: Settings },
  { path: '/admin/clients', label: 'Clientes', icon: Users },
  { path: '/admin/extras', label: 'Extras', icon: Sparkles },
  { path: '/admin/settings', label: 'Configurações', icon: SlidersHorizontal },
  { path: '/admin/vehicle-types', label: 'Tipos de Veículos', icon: Car },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = JSON.parse(localStorage.getItem('branding') || '{}');
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 px-6 py-5">
          <div
  className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ${
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
    <Droplets className="h-5 w-5 text-primary-foreground" />
  )}
</div>
          <span className="tracking-tight text-lg font-bold text-sidebar-primary-foreground">
                {branding.name || 'WashHub'}
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-primary-foreground">
                {user?.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
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
            <span className="font-bold text-foreground">WashHub</span>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </header>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border bg-card lg:hidden"
            >
              <nav className="space-y-1 px-3 py-2">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}