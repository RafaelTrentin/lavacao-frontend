import { useBranding } from '@/hooks/useBranding';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationsPage from '@/pages/client/NotificationsPage';
import LoginPage from '@/pages/LoginPage';
import ClientHomePage from '@/pages/client/ClientHomePage';
import NewAppointmentPage from '@/pages/client/NewAppointmentPage';
import MyAppointmentsPage from '@/pages/client/MyAppointmentsPage';
import ProfilePage from '@/pages/client/ProfilePage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminSchedulePage from '@/pages/admin/AdminSchedulePage';
import AdminServiceModesPage from '@/pages/admin/AdminServiceModesPage';
import AdminClientsPage from '@/pages/admin/AdminClientsPage';
import AdminExtrasPage from '@/pages/admin/AdminExtrasPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import NotFound from '@/pages/NotFound';
import AdminVehicleTypesPage from './pages/admin/AdminVehicleTypesPage';
import ClientExtrasPage from '@/pages/client/ClientExtrasPage';
import RegisterPage from '@/pages/RegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppRoutes() {
  useBranding();
  const { isAuthenticated, isAdmin, isLoading, businessSlug } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<NotFound />} />

      <Route
        path="/empresa/:slug/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={isAdmin ? '/admin' : `/empresa/${businessSlug || ''}`}
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/empresa/:slug/register"
        element={
          isAuthenticated ? (
            <Navigate
              to={isAdmin ? '/admin' : `/empresa/${businessSlug || ''}`}
              replace
            />
          ) : (
            <RegisterPage />
          )
        }
      />

      <Route
        path="/admin/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={isAdmin ? '/admin' : `/empresa/${businessSlug || ''}`}
              replace
            />
          ) : (
            <LoginPage adminMode />
          )
        }
      />

      <Route
        path="/empresa/:slug"
        element={
          <ProtectedRoute>
            <ClientHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa/:slug/new-appointment"
        element={
          <ProtectedRoute>
            <NewAppointmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa/:slug/my-appointments"
        element={
          <ProtectedRoute>
            <MyAppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa/:slug/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa/:slug/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa/:slug/extras"
        element={
          <ProtectedRoute>
            <ClientExtrasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedule"
        element={
          <ProtectedRoute requireAdmin>
            <AdminSchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/service-modes"
        element={
          <ProtectedRoute requireAdmin>
            <AdminServiceModesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute requireAdmin>
            <AdminClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/extras"
        element={
          <ProtectedRoute requireAdmin>
            <AdminExtrasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vehicle-types"
        element={
          <ProtectedRoute requireAdmin>
            <AdminVehicleTypesPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;