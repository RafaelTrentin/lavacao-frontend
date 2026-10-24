
import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isAdmin,
    isLoading,
    businessSlug,
    logout,
  } = useAuth();

  const location = useLocation();
  const params = useParams();
  const currentSlug = params.slug;

  const logoutStarted = useRef(false);

  const wrongBusiness =
    !isLoading &&
    isAuthenticated &&
    !isAdmin &&
    !!currentSlug &&
    !!businessSlug &&
    currentSlug !== businessSlug;

  useEffect(() => {
    if (!wrongBusiness) {
      logoutStarted.current = false;
      return;
    }

    if (logoutStarted.current) return;

    logoutStarted.current = true;

    void logout();
  }, [wrongBusiness, logout]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (Capacitor.isNativePlatform()) {
      return <Navigate to="/app/selecionar-empresa" replace />;
    }

    if (currentSlug) {
      return (
        <Navigate
          to={`/empresa/${currentSlug}/login`}
          replace
        />
      );
    }

    return <Navigate to="/admin/login" replace />;
  }

  // Administrador não acessa as telas do cliente.
  if (isAdmin && location.pathname.startsWith('/empresa/')) {
    return <Navigate to="/admin" replace />;
  }

  // Bloqueia imediatamente o conteúdo de outra empresa.
  if (wrongBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Cliente não acessa rotas administrativas.
  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to={businessSlug ? `/empresa/${businessSlug}` : '/admin/login'}
        replace
      />
    );
  }

  return <>{children}</>;
}
