// Persist recipient IDs only; subscription credentials remain in app storage.
const bindingCache = 'washsync-push-session-v1';
const bindingPath = '/__washsync_push_binding';
let operations = Promise.resolve();
function serialize(work) {
  const result = operations.then(work);
  operations = result.catch(() => {});
  return result;
}
async function readBinding() {
  const response = await (await caches.open(bindingCache)).match(bindingPath);
  return response ? response.json() : null;
}
function sameRecipient(a, b) {
  return !!a && !!b && typeof a.userId === 'string' && typeof a.businessId === 'string' &&
    a.userId === b.userId && a.businessId === b.businessId;
}
function safeUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  const url = new URL(value, self.location.origin);
  if (url.origin !== self.location.origin || url.search || url.hash) return null;
  return /^\/admin\/notifications$/.test(url.pathname) ||
    /^\/empresa\/[a-zA-Z0-9_-]+\/notifications$/.test(url.pathname) ? url.href : null;
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WASHSYNC_PUSH_BINDING') return;
  event.waitUntil(serialize(async () => {
    const client = event.source?.id && await self.clients.get(event.source.id);
    if (!client || new URL(client.url).origin !== self.location.origin) return;
    const binding = event.data.binding;
    if (binding && (typeof binding.userId !== 'string' || typeof binding.businessId !== 'string')) return;
    await (await caches.open(bindingCache)).put(bindingPath, new Response(JSON.stringify(binding || null)));
    for (const notification of await self.registration.getNotifications()) {
      if (!sameRecipient(binding, notification.data)) notification.close();
    }
    event.ports[0]?.postMessage({ ok: true });
  }).catch(() => event.ports[0]?.postMessage({ ok: false })));
});
self.addEventListener('push', (event) => {
  event.waitUntil(serialize(async () => {
    let data;
    try { data = event.data?.json(); } catch { return; }
    const url = safeUrl(data?.url);
    if (!sameRecipient(await readBinding(), data) || !url) return;
    await self.registration.showNotification(data.title || 'WashSync', {
      body: data.body || 'Nova notificacao.',
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      data: { url: new URL(url).pathname, userId: data.userId, businessId: data.businessId },
    });
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(serialize(async () => {
    const data = event.notification.data;
    const url = safeUrl(data?.url);
    if (!url || !sameRecipient(await readBinding(), data)) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
