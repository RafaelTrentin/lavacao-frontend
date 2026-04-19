import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading, businessSlug, logout } = useAuth();
  const location = useLocation();
  const params = useParams();
  const currentSlug = params.slug;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentSlug) {
      return <Navigate to={`/empresa/${currentSlug}/login`} replace />;
    }

    return <Navigate to="/admin/login" replace />;
  }

  // ADMIN nunca entra em rota de cliente
  if (isAdmin && location.pathname.startsWith('/empresa/')) {
    return <Navigate to="/admin" replace />;
  }

  // CLIENTE nunca entra em rota de outra empresa
  if (
    !isAdmin &&
    currentSlug &&
    businessSlug &&
    currentSlug !== businessSlug
  ) {
    logout();
    return <Navigate to={`/empresa/${currentSlug}/login`} replace />;
  }

  // CLIENTE nunca entra em rota administrativa
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