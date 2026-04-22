import { Navigate } from 'react-router-dom';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('washhub_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function RootRedirect() {
  const slug = localStorage.getItem('washhub_business_slug');
  const token = localStorage.getItem('washhub_token');
  const user = getStoredUser();

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

  // fallback
  return <Navigate to="/admin/login" replace />;
}