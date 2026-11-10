import { useSyncExternalStore, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getSessionCache, subscribeSessionCache } from '@/lib/session-cache';

export default function SessionQueryProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSessionCache, getSessionCache);
  return (
    <QueryClientProvider key={session.revision} client={session.client}>
      {children}
    </QueryClientProvider>
  );
}
