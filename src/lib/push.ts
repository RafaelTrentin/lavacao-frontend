import { pushNotificationsApi } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push não suportado neste navegador');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada');
  }

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await pushNotificationsApi.getPublicKey();

  if (!publicKey) {
    throw new Error('Chave pública de push não configurada');
  }

  // Remove inscrição antiga para garantir vínculo novo com as chaves atuais
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    try {
      await pushNotificationsApi.unsubscribe(existingSubscription.endpoint);
    } catch {
      // ignora falha de cleanup no backend
    }

    try {
      await existingSubscription.unsubscribe();
    } catch {
      // ignora falha local de unsubscribe
    }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await pushNotificationsApi.subscribe(subscription.toJSON());

  return true;
}