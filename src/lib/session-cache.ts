import { QueryClient } from '@tanstack/react-query';

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
  });
}

// A new cache for every session, including a new login by the same user.
// Old observers/mutation callbacks can only reach the discarded client.
let session = { revision: 0, client: createClient() };
const listeners = new Set<() => void>();
export const SESSION_EXPIRED_EVENT = 'washsync:session-expired';

export const getSessionCache = () => session;
export function subscribeSessionCache(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function resetSessionCache() {
  const previous = session.client;
  session = { revision: session.revision + 1, client: createClient() };
  // Cancellation stops query retries/results even when queryFn ignores signal.
  void previous.cancelQueries();
  previous.clear();
  listeners.forEach((listener) => listener());
}
