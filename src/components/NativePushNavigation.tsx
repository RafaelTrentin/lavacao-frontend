
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/contexts/AuthContext';

type PushDestination = '/notifications' | '/my-appointments';

export default function NativePushNavigation() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isLoading, businessSlug } = useAuth();

  const [pendingDestination, setPendingDestination] =
    useState<PushDestination | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: { remove: () => Promise<void> } | null = null;

    void PushNotifications.addListener(
      'pushNotificationActionPerformed',
      ({ notification }) => {
        const url = notification.data?.url;

        if (url === '/notifications' || url === '/my-appointments') {
          setPendingDestination(url);
        }
      },
    )
      .then(async (handle) => {
        if (disposed) {
          await handle.remove();
        } else {
          listener = handle;
        }
      })
      .catch((error) => {
        console.warn('Erro ao registrar navegação push:', error);
      });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingDestination || isLoading || !isAuthenticated) return;

    if (isAdmin) {
      setPendingDestination(null);
      navigate('/admin/notifications');
      return;
    }

    if (!businessSlug) return;

    const destination = pendingDestination;
    setPendingDestination(null);

    const slug = encodeURIComponent(businessSlug);

    if (destination === '/notifications') {
      navigate(`/empresa/${slug}/notifications`);
    } else if (destination === '/my-appointments') {
      navigate(`/empresa/${slug}/my-appointments`);
    }
  }, [
    pendingDestination,
    isLoading,
    isAuthenticated,
    isAdmin,
    businessSlug,
    navigate,
  ]);

  return null;
}
