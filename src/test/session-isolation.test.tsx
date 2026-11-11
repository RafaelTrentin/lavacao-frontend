import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import SessionQueryProvider from '@/components/SessionQueryProvider';
import api, { customersApi, pushNotificationsApi } from '@/lib/api';
import { getSessionCache, resetSessionCache } from '@/lib/session-cache';
import { unregisterNativePushNotifications } from '@/lib/push';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppChangeBusinessPage from '@/pages/AppChangeBusinessPage';
import ProtectedRoute from '@/components/ProtectedRoute';

vi.hoisted(() => { vi.stubEnv('VITE_API_BASE_URL', 'https://example.test'); });

vi.mock('@/lib/push', () => ({
  isNativePushSupported: () => false,
  unregisterNativePushNotifications: vi.fn().mockResolvedValue(undefined),
  checkNativePushRegistration: vi.fn(), syncNativePushNotifications: vi.fn(),
}));
vi.mock('@/lib/native-push-revocation', () => ({ flushPendingNativePushRevocation: vi.fn().mockResolvedValue(true) }));

// No network: Axios uses an in-memory adapter; auth/cache/interceptors are real.
let auth: ReturnType<typeof useAuth>;
const identities = {
  a: { sub: 'a', businessId: 'wash-1' },
  b: { sub: 'b', businessId: 'wash-1' },
  c: { sub: 'c', businessId: 'wash-2' },
};
function tokenFor(name: keyof typeof identities) {
  return `e30.${btoa(JSON.stringify({ ...identities[name], email: `${name}@example.test`, role: 'CUSTOMER', exp: 4000000000 }))}.test`;
}
function reply(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function Probe() {
  auth = useAuth();
  const [draft, setDraft] = useState('');
  const profile = useQuery({ queryKey: ['customer-profile'], queryFn: customersApi.getProfile, enabled: auth.isAuthenticated });
  return <>
    <div data-testid="identity">{auth.user?.id || 'anonymous'}</div>
    <div data-testid="profile">{profile.data?.name || 'empty'}</div>
    <input aria-label="draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
  </>;
}
async function mount() {
  render(<AuthProvider><SessionQueryProvider><Probe /></SessionQueryProvider></AuthProvider>);
  await waitFor(() => expect(auth.isLoading).toBe(false));
}
async function login(name: keyof typeof identities) {
  await act(async () => { await auth.login(name, 'test-password', identities[name].businessId); });
}
async function logout() {
  await act(async () => { await auth.logout(); });
}

it('does not start session logout from a Web Push 401 while registration holds its lock', async () => {
  const original = axios.defaults.adapter;
  localStorage.setItem('washsync_token', tokenFor('b'));
  axios.defaults.adapter = async (config) => {
    expect(config.headers.Authorization).toBe(`Bearer ${tokenFor('a')}`);
    throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined,
      { ...reply(config, {}), status: 401 });
  };
  try {
    await expect(pushNotificationsApi.subscribe({ endpoint: 'https://push.example.test/a' }, tokenFor('a'))).rejects.toThrow('unauthorized');
    await expect(pushNotificationsApi.getPublicKey(tokenFor('a'))).rejects.toThrow('unauthorized');
    expect(localStorage.getItem('washsync_token')).toBe(tokenFor('b'));
  } finally { axios.defaults.adapter = original; }
});

it('updates identity and private cache when another tab logs in to a different company', async () => {
  await mount(); await login('a');
  const previous = getSessionCache().client;
  previous.setQueryData(['private'], 'account-a');
  await act(async () => {
    localStorage.setItem('washsync_token', tokenFor('c'));
    localStorage.setItem('washsync_business_slug', 'wash-2');
    window.dispatchEvent(new StorageEvent('storage', { key: 'washsync_token', newValue: tokenFor('c') }));
  });
  expect(auth.user?.id).toBe('c'); expect(auth.businessSlug).toBe('wash-2');
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
});
it('clears the React session when another tab logs out', async () => {
  await mount(); await login('a');
  await act(async () => {
    localStorage.removeItem('washsync_token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'washsync_token', newValue: null }));
  });
  expect(auth.isAuthenticated).toBe(false);
  expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
});
const originalAdapter = api.defaults.adapter;
beforeEach(() => {
  localStorage.clear();
  resetSessionCache();
  vi.mocked(unregisterNativePushNotifications).mockResolvedValue(undefined);
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/login' || config.url === '/auth/signup') {
      const name = JSON.parse(config.data).email as keyof typeof identities;
      return reply(config, { accessToken: tokenFor(name) });
    }
    const name = Object.keys(identities).find((key) => config.headers.Authorization === `Bearer ${tokenFor(key as keyof typeof identities)}`);
    return reply(config, { name: `private-${name}` });
  };
});
afterEach(() => {
  cleanup();
  resetSessionCache();
  api.defaults.adapter = originalAdapter;
  localStorage.clear();
  vi.restoreAllMocks();
});

it.each(['b', 'c'] as const)('isolates A → logout → %s, including same-company accounts and local form state', async (next) => {
  await mount();
  await login('a');
  await screen.findByText('private-a');
  fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'private draft A' } });
  const previous = getSessionCache().client;
  previous.setQueryData(['admin-clients'], ['private-list-A']);
  previous.getMutationCache().build(previous, {}).state.data = 'private-mutation-A';
  await logout();
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
  expect(previous.getMutationCache().getAll()).toHaveLength(0);
  expect(screen.getByTestId('profile')).toHaveTextContent('empty');
  expect(screen.getByLabelText('draft')).toHaveValue('');
  await login(next);
  expect(screen.queryByText('private-a')).not.toBeInTheDocument();
  await screen.findByText(`private-${next}`);
  expect(getSessionCache().client.getQueryData(['admin-clients'])).toBeUndefined();
});

it('also isolates a direct authenticated session replacement', async () => {
  await mount();
  await login('a');
  await screen.findByText('private-a');
  await login('c');
  expect(screen.queryByText('private-a')).not.toBeInTheDocument();
  await screen.findByText('private-c');
});

it('discards a delayed HTTP success and cannot repopulate either cache after logout/login', async () => {
  await mount();
  await login('a');
  await screen.findByText('private-a');
  const oldClient = getSessionCache().client;
  const pending = deferred<ReturnType<typeof reply>>();
  const adapter = api.defaults.adapter;
  let config!: InternalAxiosRequestConfig;
  api.defaults.adapter = (request) => { config = request; return pending.promise; };
  const oldQuery = oldClient.fetchQuery({ queryKey: ['delayed-profile'], queryFn: customersApi.getProfile }).catch((error) => error);
  await waitFor(() => expect(config).toBeDefined());
  await logout();
  api.defaults.adapter = adapter;
  await login('c');
  await act(async () => { pending.resolve(reply(config, { name: 'secret-late-A' })); await oldQuery; });
  await screen.findByText('private-c');
  expect(screen.queryByText('secret-late-A')).not.toBeInTheDocument();
  expect(oldClient.getQueryCache().getAll()).toHaveLength(0);
  expect(getSessionCache().client.getQueryData(['delayed-profile'])).toBeUndefined();
});

it.each(['b', 'a'] as const)('ignores an old 401 after login %s, even if the JWT is identical', async (next) => {
  await mount();
  await login('a');
  const pending = deferred<ReturnType<typeof reply>>();
  let config!: InternalAxiosRequestConfig;
  const request = api.get('/delayed', { adapter: (value) => { config = value; return pending.promise; } }).catch((error) => error);
  await logout();
  await login(next);
  await act(async () => {
    pending.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { ...reply(config, {}), status: 401 }));
    expect(axios.isCancel(await request)).toBe(true);
  });
  expect(auth.user?.id).toBe(next);
  expect(localStorage.getItem('washsync_token')).toBe(tokenFor(next));
});

it('discards delayed mutation success before its onSuccess can write to storage', async () => {
  await mount();
  await login('a');
  const pending = deferred<ReturnType<typeof reply>>();
  let config!: InternalAxiosRequestConfig;
  const client = getSessionCache().client;
  const success = vi.fn(() => localStorage.setItem('branding', 'old branding'));
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => api.put('/business/branding', {}, { adapter: (value) => { config = value; return pending.promise; } }),
    onSuccess: success,
  });
  const result = mutation.execute(undefined).catch((error) => error);
  await waitFor(() => expect(config).toBeDefined());
  await logout();
  await login('b');
  await act(async () => { pending.resolve(reply(config, {})); expect(axios.isCancel(await result)).toBe(true); });
  expect(success).not.toHaveBeenCalled();
  expect(localStorage.getItem('branding')).toBeNull();
});

it('does not let a delayed login restore a session after logout', async () => {
  await mount();
  const pending = deferred<ReturnType<typeof reply>>();
  let config!: InternalAxiosRequestConfig;
  api.defaults.adapter = (value) => { config = value; return pending.promise; };
  const result = auth.login('a', 'test-password').catch((error) => error);
  await logout();
  await act(async () => { pending.resolve(reply(config, { accessToken: tokenFor('a') })); await result; });
  expect(auth.isAuthenticated).toBe(false);
  expect(localStorage.getItem('washsync_token')).toBeNull();
});

it('waits for push revocation and blocks login during logout, then clears private cache', async () => {
  await mount();
  await login('a');
  const pending = deferred<void>();
  vi.mocked(unregisterNativePushNotifications).mockReturnValueOnce(pending.promise);
  let result!: Promise<void>;
  act(() => { result = auth.logout(); });
  await expect(auth.login('b', 'test-password')).rejects.toThrow('Aguarde');
  expect(localStorage.getItem('washsync_token')).toBe(tokenFor('a'));
  await act(async () => { pending.resolve(); await result; });
  expect(auth.isAuthenticated).toBe(false);
  expect(getSessionCache().client.getQueryData(['customer-profile'])).toBeUndefined();
});

it('clears cache and auth state on a current-session 401', async () => {
  await mount();
  await login('a');
  const previous = getSessionCache().client;
  // jsdom reports full-page navigation as unsupported; no real navigation occurs.
  const navigationWarning = vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    await api.get('/current-401', { adapter: async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { ...reply(config, {}), status: 401 });
    } }).catch(() => {});
  });
  expect(auth.isAuthenticated).toBe(false);
  expect(localStorage.getItem('washsync_token')).toBeNull();
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
  navigationWarning.mockRestore();
});

it('uses the central logout when entering the change-business route and preserves its destination', async () => {
  localStorage.setItem('washsync_token', tokenFor('a'));
  const previous = getSessionCache().client;
  previous.setQueryData(['customer-profile'], { name: 'private-a' });
  render(<AuthProvider><MemoryRouter initialEntries={['/app/trocar-lavacao']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SessionQueryProvider><Routes>
      <Route path="/app/trocar-lavacao" element={<AppChangeBusinessPage />} />
      <Route path="/app/selecionar-empresa" element={<div>select-business</div>} />
    </Routes></SessionQueryProvider>
  </MemoryRouter></AuthProvider>);
  await screen.findByText('select-business');
  expect(unregisterNativePushNotifications).toHaveBeenCalled();
  expect(localStorage.getItem('washsync_token')).toBeNull();
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
});

it('keeps ProtectedRoute blocking another business and clears the old session', async () => {
  localStorage.setItem('washsync_token', tokenFor('a'));
  localStorage.setItem('washsync_business_slug', 'wash-1');
  const previous = getSessionCache().client;
  previous.setQueryData(['customer-profile'], { name: 'private-a' });
  render(<AuthProvider><MemoryRouter initialEntries={['/empresa/wash-2']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SessionQueryProvider><Routes>
      <Route path="/empresa/:slug" element={<ProtectedRoute><div>private-content</div></ProtectedRoute>} />
      <Route path="/empresa/:slug/login" element={<div>business-login</div>} />
    </Routes></SessionQueryProvider>
  </MemoryRouter></AuthProvider>);
  expect(screen.queryByText('private-content')).not.toBeInTheDocument();
  await screen.findByText('business-login');
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
  expect(localStorage.getItem('washsync_token')).toBeNull();
});

it('rotates the cache on signup as well as login', async () => {
  await mount();
  await login('a');
  const previous = getSessionCache().client;
  await act(async () => {
    await auth.signup({ email: 'b', password: 'test-password', name: 'Test', phone: '00000000000', role: 'CUSTOMER', businessSlug: 'wash-1' });
  });
  await screen.findByText('private-b');
  expect(previous.getQueryCache().getAll()).toHaveLength(0);
});

it('cancels query retries even when the HTTP transport ignores cancellation', async () => {
  await mount();
  await login('a');
  const pending = deferred<string>();
  const queryFn = vi.fn(() => pending.promise);
  const previous = getSessionCache().client;
  const result = previous.fetchQuery({ queryKey: ['retrying'], queryFn, retry: 3, retryDelay: 0 }).catch((error) => error);
  await logout();
  await login('b');
  await act(async () => { pending.reject(new Error('late network failure')); await result; });
  expect(queryFn).toHaveBeenCalledTimes(1);
  expect(getSessionCache().client.getQueryData(['retrying'])).toBeUndefined();
});
