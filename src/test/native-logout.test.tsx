import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import SessionQueryProvider from '@/components/SessionQueryProvider';
import AppChangeBusinessPage from '@/pages/AppChangeBusinessPage';
import { getSessionCache, resetSessionCache } from '@/lib/session-cache';
import { enableNativePushNotifications, unregisterNativePushNotifications } from '@/lib/push';
import { flushPendingNativePushRevocation } from '@/lib/native-push-revocation';
import api from '@/lib/api';

vi.hoisted(() => { vi.stubEnv('VITE_API_BASE_URL', 'https://example.test'); });
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => true), getPlatform: () => 'android' } }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({ SecureStorage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: {
  checkPermissions: vi.fn(), requestPermissions: vi.fn(), addListener: vi.fn(), register: vi.fn(),
} }));

// Real auth, push, revocation and Axios interceptors. Only native plugins and
// HTTP transport are simulated; no device registration or real mail/user data.
const storageKey = 'washsync_push_revocation_v1';
const fixture = { installationId: 'test-installation', fcmToken: 'test-fcm', revocationKey: 'a'.repeat(64), pending: false };
const secure = new Map<string, string>();
const listeners = new Map<string, (value: unknown) => void>();
let auth: ReturnType<typeof useAuth>;
let online: boolean;
let calls: { url: string; authorization: unknown }[];
let revokeWait: Promise<void> | null;
const originalAdapter = api.defaults.adapter;

function jwt(id: 'a' | 'b') {
  return `e30.${btoa(JSON.stringify({ sub: id, businessId: `wash-${id}`, email: `${id}@example.test`, role: id === 'b' ? 'ADMIN' : 'CUSTOMER', exp: 4000000000 }))}.test`;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function Probe() {
  auth = useAuth();
  return null;
}
function seed() {
  localStorage.setItem('washsync_token', jwt('a'));
  localStorage.setItem('washsync_business_slug', 'wash-a');
  localStorage.setItem('washsync_native_push_token', fixture.fcmToken);
  secure.set(storageKey, JSON.stringify(fixture));
}
async function mount(path = '/') {
  const view = render(<AuthProvider><Probe /><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SessionQueryProvider><Routes>
      <Route path="/" element={<div>home</div>} />
      <Route path="/app/trocar-lavacao" element={<AppChangeBusinessPage />} />
      <Route path="/app/selecionar-empresa" element={<div>select-business</div>} />
    </Routes></SessionQueryProvider>
  </MemoryRouter></AuthProvider>);
  await waitFor(() => expect(auth.isLoading).toBe(false));
  return view;
}
const revokes = () => calls.filter((call) => call.url === '/push-notifications/devices/revoke');
const registrations = () => calls.filter((call) => call.url === '/push-notifications/devices');

beforeEach(() => {
  vi.clearAllMocks();
  secure.clear(); listeners.clear(); localStorage.clear(); resetSessionCache();
  localStorage.setItem('washsync_native_installation_id', fixture.installationId);
  online = true; revokeWait = null; calls = [];
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(SecureStorage.get).mockImplementation(async (key) => secure.get(key) ?? null);
  vi.mocked(SecureStorage.set).mockImplementation(async (key, value) => { secure.set(key, value as string); });
  vi.mocked(SecureStorage.remove).mockImplementation(async (key) => secure.delete(key));
  vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: 'prompt' });
  vi.mocked(PushNotifications.addListener).mockImplementation(async (event, callback) => {
    listeners.set(event, callback);
    return { remove: async () => { listeners.delete(event); } };
  });
  vi.mocked(PushNotifications.register).mockImplementation(async () => {
    listeners.get('registration')?.({ value: fixture.fcmToken });
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url!, authorization: config.headers.Authorization });
    let data: unknown = {};
    if (config.url === '/push-notifications/devices/revoke') {
      if (!online) throw new Error('simulated offline');
      if (revokeWait) await revokeWait;
    }
    if (config.url === '/auth/login') data = { accessToken: jwt(JSON.parse(config.data).email) };
    if (config.url === '/push-notifications/devices/status') data = { registered: true };
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
});
afterEach(async () => {
  cleanup();
  await flushPendingNativePushRevocation();
  resetSessionCache(); api.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
});

it('online: keeps revocation credentials until confirmation, then clears session/cache and selects a business', async () => {
  seed();
  const previous = getSessionCache().client;
  previous.setQueryData(['customer-profile'], { name: 'private-A' });
  const pending = deferred<void>(); revokeWait = pending.promise;
  await mount('/app/trocar-lavacao');
  await waitFor(() => expect(revokes()).toHaveLength(1));
  expect(JSON.parse(secure.get(storageKey)!)).toEqual({ ...fixture, pending: true });
  expect(SecureStorage.remove).not.toHaveBeenCalled();
  expect(screen.queryByText('select-business')).not.toBeInTheDocument();
  expect(localStorage.getItem('washsync_token')).toBe(jwt('a'));
  await act(async () => { pending.resolve(); });
  await screen.findByText('select-business');
  expect(secure.has(storageKey)).toBe(false);
  expect(localStorage.getItem('washsync_native_push_token')).toBeNull();
  expect(localStorage.getItem('washsync_token')).toBeNull();
  expect(auth.isAuthenticated).toBe(false);
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
});

it('offline A → B: retains the pending secret, blocks B, retries online and only then registers under B', async () => {
  seed(); online = false;
  await mount('/app/trocar-lavacao');
  await screen.findByText('select-business');
  expect(JSON.parse(secure.get(storageKey)!)).toEqual({ ...fixture, pending: true });
  expect(localStorage.getItem('washsync_native_push_token')).toBe(fixture.fcmToken);
  expect(SecureStorage.remove).not.toHaveBeenCalled();
  await expect(auth.login('b', 'test-password')).rejects.toThrow('pendente');
  expect(calls.some((call) => call.url === '/auth/login')).toBe(false);
  expect(registrations()).toHaveLength(0);
  online = true;
  await act(async () => { window.dispatchEvent(new Event('online')); });
  await waitFor(() => expect(secure.has(storageKey)).toBe(false));
  vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: 'granted' });
  await act(async () => { await auth.login('b', 'test-password'); });
  await waitFor(() => expect(auth.nativePushStatus).toBe('active'));
  expect(auth.isAdmin).toBe(true);
  expect(registrations()).toEqual([{ url: '/push-notifications/devices', authorization: `Bearer ${jwt('b')}` }]);
  expect(calls.findIndex((call) => call.url === '/auth/login')).toBeGreaterThan(calls.findIndex((call) => call.url === '/push-notifications/devices/revoke'));
  expect(JSON.parse(secure.get(storageKey)!).pending).toBe(false);
});

it('recovers pending revocation after reopening without the previous JWT', async () => {
  secure.set(storageKey, JSON.stringify({ ...fixture, pending: true }));
  localStorage.setItem('washsync_native_push_token', fixture.fcmToken);
  online = false;
  const view = await mount();
  await waitFor(() => expect(revokes()).toHaveLength(1));
  expect(secure.has(storageKey)).toBe(true);
  view.unmount();
  await flushPendingNativePushRevocation();
  online = true;
  await mount();
  await waitFor(() => expect(secure.has(storageKey)).toBe(false));
  expect(revokes().every((call) => !call.authorization)).toBe(true);
});

it('double logout shares one pending operation and does not complete the second caller early', async () => {
  seed(); await mount();
  const pending = deferred<void>(); revokeWait = pending.promise;
  const first = auth.logout();
  const second = auth.logout();
  expect(second).toBe(first);
  let secondFinished = false;
  void second.then(() => { secondFinished = true; });
  await waitFor(() => expect(revokes()).toHaveLength(1));
  expect(secondFinished).toBe(false);
  await act(async () => { pending.resolve(); await Promise.all([first, second]); });
  expect(secondFinished).toBe(true);
  expect(revokes()).toHaveLength(1);
  expect(auth.isAuthenticated).toBe(false);
});

it('immediate logout waits for an in-flight registration before revoking it', async () => {
  await mount();
  const permission = deferred<{ receive: 'granted' }>();
  vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: 'granted' }).mockReturnValueOnce(permission.promise);
  await act(async () => { await auth.login('a', 'test-password', 'wash-a'); });
  let done!: Promise<void>;
  act(() => { done = auth.logout(); });
  await expect(auth.login('b', 'test-password')).rejects.toThrow('Aguarde');
  expect(registrations()).toHaveLength(0);
  await act(async () => { permission.resolve({ receive: 'granted' }); await done; });
  expect(registrations()).toEqual([{ url: '/push-notifications/devices', authorization: `Bearer ${jwt('a')}` }]);
  expect(revokes()).toHaveLength(1);
  expect(calls.findIndex((call) => call.url === '/push-notifications/devices/revoke')).toBeGreaterThan(calls.findIndex((call) => call.url === '/push-notifications/devices'));
  expect(secure.has(storageKey)).toBe(false);
  expect(auth.isAuthenticated).toBe(false);
});

it('rejects a delayed registration from A if the session has already changed to B', async () => {
  localStorage.setItem('washsync_token', jwt('a'));
  const permission = deferred<{ receive: 'granted' }>();
  vi.mocked(PushNotifications.checkPermissions).mockReturnValueOnce(permission.promise);
  const result = enableNativePushNotifications(jwt('a')).catch((error) => error);
  localStorage.setItem('washsync_token', jwt('b'));
  permission.resolve({ receive: 'granted' });
  expect(await result).toBeInstanceOf(Error);
  expect(registrations()).toHaveLength(0);
});

it('clears a saved business through central logout even when already unauthenticated', async () => {
  localStorage.setItem('washsync_business_slug', 'wash-a');
  localStorage.setItem('branding', JSON.stringify({ name: 'old-branding' }));
  await mount('/app/trocar-lavacao');
  await screen.findByText('select-business');
  expect(localStorage.getItem('washsync_business_slug')).toBeNull();
  expect(localStorage.getItem('branding')).toBeNull();
});

it('does not call native secure storage on Web logout', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  await unregisterNativePushNotifications();
  expect(SecureStorage.get).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});
