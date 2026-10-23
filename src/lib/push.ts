import { pushNotificationsApi } from '@/lib/api';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  getNativePushRevocation,
  saveNativePushRevocation,
  flushPendingNativePushRevocation,
} from '@/lib/native-push-revocation';

const NATIVE_PUSH_INSTALLATION_KEY = 'washsync_native_installation_id';

function getOrCreateNativeInstallationId(): string {
  const existing = localStorage.getItem(NATIVE_PUSH_INSTALLATION_KEY);

  if (existing) {
    return existing;
  }

  const installationId = crypto.randomUUID();

  localStorage.setItem(NATIVE_PUSH_INSTALLATION_KEY, installationId);

  return installationId;
}

function generatePushRevocationKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function assertPushSession(sessionToken: string): void {
  if (
    !sessionToken ||
    localStorage.getItem('washsync_token') !== sessionToken
  ) {
    throw new Error(
      'Sincronização de notificações cancelada: sessão alterada.',
    );
  }
}

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
export function isNativePushSupported(): boolean {
  return Capacitor.isNativePlatform() &&
    ['android', 'ios'].includes(Capacitor.getPlatform());
}

export async function syncNativePushNotifications(
  sessionToken: string,
): Promise<'synced' | 'permission-required' | 'unsupported'> {
  if (!isNativePushSupported()) {
    return 'unsupported';
  }

  // A integração de tokens FCM no iOS ainda não está pronta.
  if (Capacitor.getPlatform() !== 'android') {
    return 'unsupported';
  }

  const permission = await PushNotifications.checkPermissions();

  if (permission.receive !== 'granted') {
    return 'permission-required';
  }

assertPushSession(sessionToken);
  await enableNativePushNotifications(sessionToken);

  return 'synced';
}

export async function enableNativePushNotifications(
  sessionToken = localStorage.getItem('washsync_token'),
): Promise<boolean> {
  if (!sessionToken) {
    throw new Error('É necessário estar autenticado.');
  }
  if (!isNativePushSupported()) {
    throw new Error('Notificações nativas indisponíveis nesta plataforma.');
  }

  const platform = Capacitor.getPlatform();

  // No iOS, o plugin oficial retorna um token APNs.
  // O backend atual exige token FCM, portanto não
  // devemos registrar esse token como se fosse FCM.
  if (platform === 'ios') {
    throw new Error(
      'Notificações iOS aguardando a integração do token FCM.',
    );
  }

  let permission = await PushNotifications.checkPermissions();

  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    throw new Error('Permissão de notificações não concedida.');
  }

  // Evita múltiplos listeners e alterações simultâneas do registro.
  if (nativeRegistrationPromise) {
    const result = await nativeRegistrationPromise;
    assertPushSession(sessionToken);
    return result;
  }
  const job = registerNativeToken(sessionToken);
  nativeRegistrationPromise = job;
  try {
    return await job;
  } finally {
    if (nativeRegistrationPromise === job) nativeRegistrationPromise = null;
  }
}

let nativeRegistrationPromise: Promise<boolean> | null = null;

async function registerNativeToken(sessionToken: string): Promise<boolean> {
  // Bloqueia nova associação enquanto houver um logout não confirmado.
  if (!(await flushPendingNativePushRevocation())) {
    throw new Error('Não foi possível concluir a revogação anterior. Verifique a conexão.');
  }
  assertPushSession(sessionToken);

  return new Promise<boolean>((resolve, reject) => {
    let finished = false;
    let registrationHandle: { remove(): Promise<void> } | null = null;
    let errorHandle: { remove(): Promise<void> } | null = null;

    const finish = async (error?: unknown) => {
      if (finished) return;
      finished = true;
      await Promise.allSettled([registrationHandle?.remove(), errorHandle?.remove()]);
      if (error !== undefined) reject(error);
      else resolve(true);
    };

    void (async () => {
      try {
        registrationHandle = await PushNotifications.addListener('registration', ({ value }) => {
          void (async () => {
            try {
              assertPushSession(sessionToken);
              const installationId = getOrCreateNativeInstallationId();
              let saved = await getNativePushRevocation();
              if (saved?.pending) throw new Error('Revogação anterior ainda pendente.');

              const oldToken = saved?.fcmToken ?? getRegisteredNativePushToken();
              if (saved && saved.installationId !== installationId) {
                throw new Error('Identificação da instalação inconsistente.');
              }

              // O hash da chave é UNIQUE: não reutilizar a mesma chave com
              // dois tokens distintos durante a rotação do FCM.
              if (saved && saved.fcmToken !== value) {
                await saveNativePushRevocation({ ...saved, pending: true });
                if (!(await flushPendingNativePushRevocation())) {
                  throw new Error('Não foi possível revogar o token FCM anterior.');
                }
                saved = null;
              }

              const revocationKey = saved?.revocationKey ?? generatePushRevocationKey();
              await saveNativePushRevocation({
                installationId,
                fcmToken: value,
                revocationKey,
                pending: false,
              });

              assertPushSession(sessionToken);
              await pushNotificationsApi.registerDevice({
                platform: 'ANDROID', token: value, installationId, revocationKey,
              }, sessionToken);
              assertPushSession(sessionToken);
              localStorage.setItem('washsync_native_push_token', value);

              // Migração de registro legado (anterior à revocationKey).
              if (!saved && oldToken && oldToken !== value) {
                try {
                  assertPushSession(sessionToken);
                  await pushNotificationsApi.unregisterDevice(oldToken);
                } catch (error) {
                  console.warn('[WashSync Push] Registro legado anterior não removido.', error);
                }
              }
              await finish();
            } catch (error) {
              await finish(error);
            }
          })();
        });
        errorHandle = await PushNotifications.addListener('registrationError', () => {
          void finish(new Error('Falha ao obter token FCM no dispositivo.'));
        });
        await PushNotifications.register();
      } catch (error) {
        await finish(error);
      }
    })();
  });
}

export function getRegisteredNativePushToken(): string | null {
  return localStorage.getItem('washsync_native_push_token');
}

export async function unregisterNativePushNotifications(): Promise<void> {
  // Coordena com qualquer registro FCM iniciado pela tela ou sincronização.
  if (nativeRegistrationPromise) {
    try { await nativeRegistrationPromise; } catch { /* revogação ainda será tentada */ }
  }
  const record = await getNativePushRevocation();
  if (record) {
    // Grava a pendência ANTES de tentar a rede. Mesmo se o app fechar,
    // o segredo continuará disponível no armazenamento nativo.
    await saveNativePushRevocation({ ...record, pending: true });
    if (!(await flushPendingNativePushRevocation())) {
      throw new Error('Revogação pendente: será tentada na próxima conexão.');
    }
    return;
  }

  // Fallback de instalações anteriores à introdução da credencial.
  const token = getRegisteredNativePushToken();
  if (!token) return;
  await pushNotificationsApi.unregisterDevice(token);
  localStorage.removeItem('washsync_native_push_token');
}

export async function checkNativePushRegistration(): Promise<
  'active' | 'inactive' | 'unknown'
> {
  if (!isNativePushSupported()) {
    return 'inactive';
  }

  const token = getRegisteredNativePushToken();

  if (!token) {
    return 'inactive';
  }

  try {
    const result = await pushNotificationsApi.getDeviceStatus(token);

    return result.registered ? 'active' : 'inactive';
  } catch (error) {
    console.warn(
      'Não foi possível verificar o registro das notificações:',
      error,
    );

    return 'unknown';
  }
}