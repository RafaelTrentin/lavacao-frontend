import { Capacitor } from '@capacitor/core';
import { jwtDecode } from 'jwt-decode';
import { pushNotificationsApi } from './api';

const ACTIVE = 'washsync_web_push_binding';
const PENDING = 'washsync_web_push_pending';
const GENERATION = 'washsync_web_push_generation';
type Binding = PushSubscriptionJSON & { userId: string; businessId: string };
const supported = () => !Capacitor.isNativePlatform() && 'serviceWorker' in navigator;
const pending = (): Binding[] => JSON.parse(localStorage.getItem(PENDING) || '[]');
const active = (): Binding | null => JSON.parse(localStorage.getItem(ACTIVE) || 'null');

async function locked<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('Este navegador não permite coordenar Web Push entre abas.');
  return navigator.locks.request('washsync-web-push', work);
}

async function registration() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) throw new Error('Service worker indisponível. Recarregue a página.');
  return reg;
}

async function bindWorker(reg: ServiceWorkerRegistration, binding: Binding | null) {
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Atualize a página para sincronizar Web Push.')); }, 3000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timer); channel.port1.close();
      if (data?.ok) resolve(); else reject(new Error('Falha ao persistir sessão Web Push.'));
    };
    reg.active!.postMessage({ type: 'WASHSYNC_PUSH_BINDING', binding: binding && {
      userId: binding.userId, businessId: binding.businessId,
    } }, [channel.port2]);
  });
}

function queue(binding: Binding) {
  const list = pending();
  if (!list.some((item) => item.endpoint === binding.endpoint && item.userId === binding.userId && item.businessId === binding.businessId)) {
    localStorage.setItem(PENDING, JSON.stringify([...list, binding]));
  }
}

async function flush() {
  for (const item of pending()) {
    try { await pushNotificationsApi.revokeWeb(item); }
    catch { return false; }
    localStorage.setItem(PENDING, JSON.stringify(pending().filter((entry) =>
      entry.endpoint !== item.endpoint || entry.userId !== item.userId || entry.businessId !== item.businessId)));
  }
  return true;
}

export async function flushPendingWebPush() {
  if (!supported() || !navigator.locks) return;
  await locked(flush);
}

// Invalidate all in-flight registrations immediately, across tabs, before waiting.
export async function unregisterWebPush(): Promise<void> {
  if (!supported()) return;
  localStorage.setItem(GENERATION, crypto.randomUUID());
  const cleanup = async () => {
    const saved = active();
    if (saved) queue(saved); // Persist proof before any network request.
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) {
      // Local suppression does not depend on the backend being reachable.
      // Persist directly as well, so an updating/terminated worker cannot leave
      // the last recipient enabled. No credentials are stored in this cache.
      await (await caches.open('washsync-push-session-v1')).put('/__washsync_push_binding', new Response('null'));
      for (const notification of await reg.getNotifications()) notification.close();
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        // Also migrate subscriptions created before local binding tracking.
        const token = localStorage.getItem('washsync_token');
        if (!saved && token) {
          const user = jwtDecode<{ sub: string; businessId: string }>(token);
          queue({ ...subscription.toJSON(), userId: user.sub, businessId: user.businessId });
        }
        await subscription.unsubscribe();
      }
      // Order pending worker tasks; older deployed workers may not acknowledge.
      await bindWorker(reg, null).catch(() => {});
    }
    localStorage.removeItem(ACTIVE);
    await flush(); // Failure retains proof; never retain the old JWT.
  };
  await (navigator.locks ? locked(cleanup) : cleanup());
}

export async function enableWebPush(): Promise<boolean> {
  if (!supported() || !('PushManager' in window) || !('Notification' in window)) throw new Error('Web Push indisponível.');
  const token = localStorage.getItem('washsync_token');
  const generation = localStorage.getItem(GENERATION);
  const assertSession = () => {
    if (!token || localStorage.getItem('washsync_token') !== token || localStorage.getItem(GENERATION) !== generation) {
      throw new Error('Sessão alterada durante o registro Web Push.');
    }
  };
  assertSession();
  if (await Notification.requestPermission() !== 'granted') throw new Error('Permissão negada.');
  return locked(async () => {
    assertSession();
    if (!(await flush())) throw new Error('Remoção Web Push anterior pendente. Verifique a conexão.');
    const reg = await registration();
    await bindWorker(reg, null);
    const { publicKey } = await pushNotificationsApi.getPublicKey(token!);
    assertSession();
    if (!publicKey) throw new Error('Chave pública de push não configurada.');
    const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    const key = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    const subscription = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const identity = jwtDecode<{ sub: string; businessId: string }>(token!);
    const binding = { ...subscription.toJSON(), userId: identity.sub, businessId: identity.businessId };
    const previous = active();
    if (previous && (previous.endpoint !== binding.endpoint || previous.userId !== binding.userId || previous.businessId !== binding.businessId)) queue(previous);
    // Record before HTTP: even an uncertain response must be revocable later.
    localStorage.setItem(ACTIVE, JSON.stringify(binding));
    try {
      assertSession();
      if (!(await flush())) throw new Error('Remoção Web Push anterior pendente.');
      await pushNotificationsApi.subscribe(subscription.toJSON(), token!);
      assertSession();
      await bindWorker(reg, binding);
      assertSession();
      return true;
    } catch (error) {
      queue(binding);
      await bindWorker(reg, null);
      await subscription.unsubscribe();
      localStorage.removeItem(ACTIVE);
      throw error;
    }
  });
}

export async function webPushStatus(): Promise<boolean> {
  if (!supported()) return false;
  const token = localStorage.getItem('washsync_token');
  const saved = active();
  if (!token || !saved || pending().length) return false;
  const user = jwtDecode<{ sub: string; businessId: string }>(token);
  if (saved.userId !== user.sub || saved.businessId !== user.businessId) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg && (await reg.pushManager.getSubscription())?.endpoint === saved.endpoint;
}

// Restore an existing opt-in after reload/worker update without prompting.
export async function syncExistingWebPush(sessionToken: string): Promise<void> {
  if (!supported() || !navigator.locks || !('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  if (subscription && localStorage.getItem('washsync_token') === sessionToken) await enableWebPush();
}
