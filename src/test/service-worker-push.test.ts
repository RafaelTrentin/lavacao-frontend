import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

let listeners: Record<string, (event: any) => void>;
let binding: any;
let worker: any;
let windowClient: any;
const identity = { userId: 'a', businessId: 'tenant-a' };
async function emit(name: string, data: any) {
  let promise: Promise<any>;
  listeners[name]({ ...data, waitUntil: (work: Promise<any>) => { promise = work; } });
  await promise!;
}
beforeEach(() => {
  listeners = {}; binding = identity;
  windowClient = { url: 'https://wash.example/admin', navigate: vi.fn(async () => {}), focus: vi.fn() };
  worker = { location: { origin: 'https://wash.example' }, addEventListener: (name: string, fn: any) => { listeners[name] = fn; },
    clients: { get: async () => windowClient, matchAll: vi.fn(async () => [windowClient]), openWindow: vi.fn() },
    registration: { showNotification: vi.fn(), getNotifications: vi.fn(async () => []) } };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: worker, URL, Response: class { constructor(public body: string) {} },
    caches: { open: async () => ({ match: async () => ({ json: async () => binding }), put: async (_: string, value: any) => { binding = JSON.parse(value.body); } }) },
  });
});
it('opens contextual same-origin notifications and awaits navigation before focus', async () => {
  const data = { ...identity, url: '/empresa/wash-a/notifications', title: 'fixture' };
  await emit('push', { data: { json: () => data } });
  expect(worker.registration.showNotification).toHaveBeenCalledOnce();
  await emit('notificationclick', { notification: { data, close: vi.fn() } });
  expect(windowClient.navigate).toHaveBeenCalledWith('https://wash.example/empresa/wash-a/notifications');
  expect(windowClient.focus).toHaveBeenCalledOnce();
});
it.each(['https://evil.test/', '//evil.test/', '/\\evil.test/', '/notifications', '/admin/notifications?next=https://evil.test', '/empresa/%2F/notifications'])('rejects unsafe or unknown URL %s', async (url) => {
  const data = { ...identity, url };
  await emit('push', { data: { json: () => data } });
  await emit('notificationclick', { notification: { data, close: vi.fn() } });
  expect(worker.registration.showNotification).not.toHaveBeenCalled();
  expect(windowClient.navigate).not.toHaveBeenCalled();
  expect(worker.clients.openWindow).not.toHaveBeenCalled();
});
it('suppresses a previous account or company at delivery and click time', async () => {
  const data = { ...identity, url: '/admin/notifications' };
  binding = { userId: 'b', businessId: 'tenant-a' };
  await emit('push', { data: { json: () => data } });
  binding = { userId: 'a', businessId: 'tenant-b' };
  await emit('notificationclick', { notification: { data, close: vi.fn() } });
  expect(worker.registration.showNotification).not.toHaveBeenCalled();
  expect(windowClient.navigate).not.toHaveBeenCalled();
});
it('persists logout and closes visible notifications for all tabs', async () => {
  const notification = { data: identity, close: vi.fn() };
  worker.registration.getNotifications.mockResolvedValue([notification]);
  const ack = vi.fn();
  await emit('message', { source: { id: 'tab-a' }, data: { type: 'WASHSYNC_PUSH_BINDING', binding: null }, ports: [{ postMessage: ack }] });
  expect(binding).toBeNull(); expect(notification.close).toHaveBeenCalledOnce(); expect(ack).toHaveBeenCalledWith({ ok: true });
});
