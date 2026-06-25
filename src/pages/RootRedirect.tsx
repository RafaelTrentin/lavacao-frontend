import { Navigate } from 'react-router-dom';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('washsync_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isNativeCapacitorApp() {
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

export default function RootRedirect() {
  const slug = localStorage.getItem('washsync_business_slug');
  const token = localStorage.getItem('washsync_token');
  const user = getStoredUser();
  const isApp = isNativeCapacitorApp();

  // Admin logado
  if (token && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  // Cliente com empresa salva
  if (slug) {
    if (token && user?.role === 'CUSTOMER') {
      return <Navigate to={`/empresa/${slug}`} replace />;
    }

    return <Navigate to={`/empresa/${slug}/login`} replace />;
  }

  // App Android/iOS sem lavação escolhida
  if (isApp) {
    return <Navigate to="/app/selecionar-empresa" replace />;
  }

  // Web sem contexto: mantém fluxo administrativo atual
  return <Navigate to="/admin/login" replace />;
}