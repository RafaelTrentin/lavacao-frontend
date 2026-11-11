import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User, SignupDTO } from '@/types';
import { authApi } from '@/lib/api';
import { unregisterWebPush, flushPendingWebPush, syncExistingWebPush } from '@/lib/web-push-session';
import { resetSessionCache, SESSION_EXPIRED_EVENT } from '@/lib/session-cache';
import { flushPendingNativePushRevocation } from '@/lib/native-push-revocation';
import {
  unregisterNativePushNotifications,
  checkNativePushRegistration,
  isNativePushSupported,
  syncNativePushNotifications,
} from '@/lib/push';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  businessId: string;
  exp?: number;
  iat?: number;
}

interface AuthContextType {
  nativePushStatus: 'active' | 'inactive' | 'unknown';
  refreshNativePushStatus: () => Promise<void>;
  user: User | null;
  token: string | null;
  businessSlug: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (
    email: string,
    password: string,
    businessSlug?: string,
  ) => Promise<void>;
  signup: (data: SignupDTO) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUserFromToken(token: string): User {
  const decoded = jwtDecode<JwtPayload>(token);

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    businessId: decoded.businessId,
  } as User;
}

function clearSessionStorage() {
  localStorage.removeItem('washsync_token');
  localStorage.removeItem('washsync_user');
  localStorage.removeItem('washsync_business_slug');
  localStorage.removeItem('branding');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nativePushStatus, setNativePushStatus] = useState<
  'active' | 'inactive' | 'unknown'
>('unknown');
const pendingPushSyncRef = useRef<Promise<void> | null>(null);
const loggingOutRef = useRef(false);
const logoutPromiseRef = useRef<Promise<void> | null>(null);
const authAttemptRef = useRef(0);

  useEffect(() => {
    if (isNativePushSupported() || !token || isLoading) return;
    const sync = () => {
      if (!loggingOutRef.current) void syncExistingWebPush(token).catch(() => {});
    };
    sync();
    window.addEventListener('online', sync);
    navigator.serviceWorker?.addEventListener('controllerchange', sync);
    return () => {
      window.removeEventListener('online', sync);
      navigator.serviceWorker?.removeEventListener('controllerchange', sync);
    };
  }, [token, isLoading]);

  useEffect(() => {
    const expireSession = () => {
      if (!isNativePushSupported()) void unregisterWebPush().catch(() => {});
      authAttemptRef.current += 1;
      clearSessionStorage();
      setToken(null);
      setUser(null);
      setBusinessSlug(null);
      setNativePushStatus('unknown');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, []);

  useEffect(() => {
    if (isNativePushSupported()) return;
    const cleanup = () => { void flushPendingWebPush().catch(() => {}); };
    const changed = (event: StorageEvent) => {
      if (event.key !== 'washsync_token' && event.key !== null) return;
      // localStorage is shared: an older tab must never retain its old identity/cache.
      authAttemptRef.current += 1;
      resetSessionCache();
      const current = localStorage.getItem('washsync_token');
      try {
        const decoded = current && jwtDecode<JwtPayload>(current);
        if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
          setUser(buildUserFromToken(current!)); setToken(current);
          setBusinessSlug(localStorage.getItem('washsync_business_slug'));
          return;
        }
      } catch { /* invalid shared session */ }
      setUser(null); setToken(null); setBusinessSlug(null);
      void unregisterWebPush().catch(() => {});
    };
    cleanup();
    window.addEventListener('online', cleanup);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('online', cleanup); window.removeEventListener('storage', changed); };
  }, []);

const refreshNativePushStatus = useCallback(async () => {
    if (!isNativePushSupported()) return;
    const currentSession = localStorage.getItem('washsync_token');
    if (!currentSession) return;
    const status = await checkNativePushRegistration();
    if (localStorage.getItem('washsync_token') === currentSession && !loggingOutRef.current) {
      setNativePushStatus(status);
    }
  }, []);

  // Tenta limpar revogações pendentes também quando o aplicativo abre
  // deslogado ou recupera a conexão. Não exige JWT do usuário anterior.
  useEffect(() => {
    if (!isNativePushSupported()) return;
    const tryCleanup = () => {
      void flushPendingNativePushRevocation().catch((error) => {
        console.warn('[WashSync Push] Não foi possível ler a revogação pendente.', error);
      });
    };
    tryCleanup();
    window.addEventListener('online', tryCleanup);
    return () => window.removeEventListener('online', tryCleanup);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('washsync_token');
    const savedBusinessSlug = localStorage.getItem('washsync_business_slug');

    if (savedToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(savedToken);
        const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : true;

        if (!isExpired) {
          const builtUser = buildUserFromToken(savedToken);
          setToken(savedToken);
          setUser(builtUser);
          setBusinessSlug(savedBusinessSlug || null);
          localStorage.setItem('washsync_user', JSON.stringify(builtUser));
        } else {
          if (!isNativePushSupported()) void unregisterWebPush().catch(() => {});
          clearSessionStorage();
          resetSessionCache();
        }
      } catch {
        if (!isNativePushSupported()) void unregisterWebPush().catch(() => {});
        clearSessionStorage();
        resetSessionCache();
      }
    }

    if (!savedToken && !isNativePushSupported()) void unregisterWebPush().catch(() => {});
    setIsLoading(false);
  }, []);


useEffect(() => {
  if (
    isLoading ||
    !token ||
    !user ||
    !isNativePushSupported() ||
    loggingOutRef.current
  ) {
    return;
  }

  let cancelled = false;
  const sessionToken = token;

  const runSync = async () => {
    try {
      // Evita iniciar outra sincronização enquanto
      // uma tentativa anterior ainda está em andamento.
      if (pendingPushSyncRef.current) {
        await pendingPushSyncRef.current;
      }

      if (
        cancelled ||
        loggingOutRef.current ||
        localStorage.getItem('washsync_token') !== sessionToken
      ) {
        return;
      }

      const result = await syncNativePushNotifications(sessionToken);

      if (
        cancelled ||
        loggingOutRef.current ||
        localStorage.getItem('washsync_token') !== sessionToken
      ) {
        return;
      }

      if (result === 'synced') {
        const status = await checkNativePushRegistration();

        if (
          !cancelled &&
          !loggingOutRef.current &&
          localStorage.getItem('washsync_token') === sessionToken
        ) {
          setNativePushStatus(status);
        }
      } else if (!cancelled && localStorage.getItem('washsync_token') === sessionToken) {
        setNativePushStatus('inactive');
      }
    } catch (error) {
      console.warn(
        '[WashSync Push] Falha na sincronização automática:',
        error,
      );

      if (
        !cancelled &&
        !loggingOutRef.current &&
        localStorage.getItem('washsync_token') === sessionToken
      ) {
        setNativePushStatus('unknown');
      }
    }
  };

  const syncPromise = runSync();
  const trackedPromise = syncPromise.finally(() => {
    if (pendingPushSyncRef.current === trackedPromise) {
      pendingPushSyncRef.current = null;
    }
  });

  pendingPushSyncRef.current = trackedPromise;

  return () => {
    cancelled = true;
  };
}, [isLoading, token, user?.id]);


  const login = useCallback(
    async (email: string, password: string, slug?: string) => {
      if (loggingOutRef.current) throw new Error('Aguarde a conclusão do logout.');
      const attempt = ++authAttemptRef.current;
      if (isNativePushSupported() && !(await flushPendingNativePushRevocation())) {
        throw new Error('A revogação de notificações da conta anterior ainda está pendente. Verifique a conexão.');
      }
      const normalizedSlug = slug?.trim() || undefined;
      if (!isNativePushSupported()) await unregisterWebPush();
      const response = await authApi.login(email, password, normalizedSlug);
      if (attempt !== authAttemptRef.current || loggingOutRef.current) {
        throw new Error('Tentativa de login cancelada: sessão alterada.');
      }
      const builtUser = buildUserFromToken(response.accessToken);
      resetSessionCache();
      localStorage.removeItem('branding');
      localStorage.setItem('washsync_token', response.accessToken);
      localStorage.setItem('washsync_user', JSON.stringify(builtUser));

      if (normalizedSlug) {
        localStorage.setItem('washsync_business_slug', normalizedSlug);
        setBusinessSlug(normalizedSlug);
      } else {
        localStorage.removeItem('washsync_business_slug');
        setBusinessSlug(null);
      }

      setToken(response.accessToken);
      setUser(builtUser);
    },
    [],
  );

  const signup = useCallback(async (data: SignupDTO) => {
    if (loggingOutRef.current) throw new Error('Aguarde a conclusão do logout.');
    const attempt = ++authAttemptRef.current;
    if (isNativePushSupported() && !(await flushPendingNativePushRevocation())) {
      throw new Error('Revogação de notificações pendente. Verifique a conexão.');
    }
    if (!isNativePushSupported()) await unregisterWebPush();
    const response = await authApi.signup(data);
    if (attempt !== authAttemptRef.current || loggingOutRef.current) {
      throw new Error('Tentativa de cadastro cancelada: sessão alterada.');
    }
    const builtUser = buildUserFromToken(response.accessToken);
    resetSessionCache();
    localStorage.removeItem('branding');
    localStorage.setItem('washsync_token', response.accessToken);
    localStorage.setItem('washsync_user', JSON.stringify(builtUser));

    if (data.businessSlug) {
      const normalizedSlug = data.businessSlug.trim();
      localStorage.setItem('washsync_business_slug', normalizedSlug);
      setBusinessSlug(normalizedSlug);
    } else {
      localStorage.removeItem('washsync_business_slug');
      setBusinessSlug(null);
    }

    setToken(response.accessToken);
    setUser(builtUser);
  }, []);


const logout = useCallback(() => {
  // Todos os chamadores aguardam a mesma revogação e limpeza de sessão.
  if (logoutPromiseRef.current) return logoutPromiseRef.current;
  loggingOutRef.current = true;
  authAttemptRef.current += 1;

  const task = (async () => {
    try {
      // Aguarda o término de uma sincronização automática
      // iniciada antes do logout.
      if (pendingPushSyncRef.current) {
        await pendingPushSyncRef.current;
      }

      if (!isNativePushSupported()) await unregisterWebPush();
      await unregisterNativePushNotifications();
    } catch (error) {
      console.error(
        'Não foi possível desvincular o dispositivo das notificações:',
        error,
      );
    } finally {
      // Etapa 05: não descartar a sessão HTTP antes da tentativa de revogação.
      clearSessionStorage();
      resetSessionCache();
      setToken(null);
      setUser(null);
      setBusinessSlug(null);
      setNativePushStatus('unknown');
      loggingOutRef.current = false;
    }
  })();
  const tracked = task.finally(() => {
    if (logoutPromiseRef.current === tracked) logoutPromiseRef.current = null;
  });
  logoutPromiseRef.current = tracked;
  return tracked;
}, []);


  return (
    <AuthContext.Provider
      value={{
        nativePushStatus,
        refreshNativePushStatus,
        user,
        token,
        businessSlug,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
