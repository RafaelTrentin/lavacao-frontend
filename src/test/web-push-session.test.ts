import { enableWebPush, unregisterWebPush, flushPendingWebPush, webPushStatus } from '@/lib/web-push-session';
import { pushNotificationsApi } from '@/lib/api';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@/lib/api', () => ({ pushNotificationsApi: { getPublicKey: vi.fn(), subscribe: vi.fn(), revokeWeb: vi.fn() } }));
let subscription: any;
let reg: any;
let binding: any;
const token = (user: string, businessId = 'tenant-a') => `e30.${btoa(JSON.stringify({ sub: user, businessId }))}.test`;
const signIn = (user: string, tenant?: string) => localStorage.setItem('washsync_token', token(user, tenant));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); binding = null;
  let chain = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_: string, job: () => Promise<any>) => {
    const result = chain.then(job); chain = result.catch(() => {}); return result;
  } } });
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', { requestPermission: vi.fn(async () => 'granted') });
  vi.stubGlobal('Response', class { constructor(public body: string) {} });
  vi.stubGlobal('caches', { open: async () => ({ put: async () => { binding = null; } }) });
  vi.stubGlobal('MessageChannel', class {
    port1 = { onmessage: null as any, close: vi.fn() };
    port2 = { postMessage: (data: any) => queueMicrotask(() => this.port1.onmessage({ data })) };
  });
  subscription = null;
  reg = {
    active: { postMessage: vi.fn(({ binding: value }, ports) => { binding = value; ports[0].postMessage({ ok: true }); }) },
    getNotifications: vi.fn(async () => []),
    pushManager: {
      getSubscription: vi.fn(async () => subscription),
      subscribe: vi.fn(async () => {
        const current = { endpoint: `https://push.example/${Math.random()}`,
          toJSON: () => ({ endpoint: current.endpoint, keys: { p256dh: 'fixture-p', auth: 'fixture-a' } }),
          unsubscribe: vi.fn(async () => { subscription = null; return true; }),
        }; subscription = current; return current;
      }),
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn(async () => reg) } });
  vi.mocked(pushNotificationsApi.getPublicKey).mockResolvedValue({ publicKey: 'YWJj' });
  vi.mocked(pushNotificationsApi.subscribe).mockResolvedValue({});
  vi.mocked(pushNotificationsApi.revokeWeb).mockResolvedValue({ success: true });
});
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('isolates login A -> push -> logout -> login B, rotating the browser endpoint', async () => {
  signIn('a'); await enableWebPush(); const first = subscription;
  expect(await webPushStatus()).toBe(true);
  await unregisterWebPush(); localStorage.removeItem('washsync_token');
  expect(binding).toBeNull(); expect(first.unsubscribe).toHaveBeenCalledOnce();
  expect(pushNotificationsApi.revokeWeb).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a', businessId: 'tenant-a', endpoint: first.endpoint }));
  signIn('b', 'tenant-b'); await enableWebPush();
  expect(subscription.endpoint).not.toBe(first.endpoint);
  expect(binding).toEqual({ userId: 'b', businessId: 'tenant-b' });
  expect(pushNotificationsApi.subscribe).toHaveBeenLastCalledWith(subscription.toJSON(), token('b', 'tenant-b'));
});
it('keeps proof offline, suppresses locally, and prevents reassociation until cleanup succeeds', async () => {
  signIn('a'); await enableWebPush();
  vi.mocked(pushNotificationsApi.revokeWeb).mockRejectedValue(new Error('offline'));
  await unregisterWebPush();
  expect(binding).toBeNull(); expect(subscription).toBeNull();
  expect(localStorage.getItem('washsync_web_push_pending')).toContain('fixture-a');
  signIn('b'); await expect(enableWebPush()).rejects.toThrow('pendente');
  vi.mocked(pushNotificationsApi.revokeWeb).mockResolvedValue({ success: true });
  await flushPendingWebPush(); await enableWebPush();
  expect(JSON.parse(localStorage.getItem('washsync_web_push_pending')!)).toEqual([]);
  expect(binding.userId).toBe('b');
});
it('coordinates a second-tab logout with a delayed subscription response', async () => {
  signIn('a'); const wait = deferred();
  vi.mocked(pushNotificationsApi.subscribe).mockReturnValueOnce(wait.promise);
  const enabling = enableWebPush(); const result = expect(enabling).rejects.toThrow('Sessão alterada');
  await vi.waitFor(() => expect(pushNotificationsApi.subscribe).toHaveBeenCalledOnce());
  const logoutFromOtherTab = unregisterWebPush();
  wait.resolve(); await result; await logoutFromOtherTab;
  expect(binding).toBeNull(); expect(subscription).toBeNull();
});
it('serializes simultaneous enable clicks across tabs and reuses only the same active subscription', async () => {
  signIn('a'); await Promise.all([enableWebPush(), enableWebPush()]);
  expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
  expect(binding.userId).toBe('a');
});
it('renews an expired browser subscription with the current authenticated identity', async () => {
  signIn('a'); await enableWebPush(); const first = subscription.endpoint;
  subscription = null; expect(await webPushStatus()).toBe(false);
  await enableWebPush(); expect(subscription.endpoint).not.toBe(first);
  expect(pushNotificationsApi.revokeWeb).toHaveBeenCalledWith(expect.objectContaining({ endpoint: first, userId: 'a' }));
  expect(binding).toEqual({ userId: 'a', businessId: 'tenant-a' });
});
it('does not register using a stale session after the permission dialog', async () => {
  signIn('a');
  vi.mocked(Notification.requestPermission).mockImplementation(async () => { signIn('b'); return 'granted'; });
  await expect(enableWebPush()).rejects.toThrow('Sessão alterada');
  expect(pushNotificationsApi.subscribe).not.toHaveBeenCalled();
});
