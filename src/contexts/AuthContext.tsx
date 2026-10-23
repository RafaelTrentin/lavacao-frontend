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
          clearSessionStorage();
        }
      } catch {
        clearSessionStorage();
      }
    }

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
      if (isNativePushSupported() && !(await flushPendingNativePushRevocation())) {
        throw new Error('A revogação de notificações da conta anterior ainda está pendente. Verifique a conexão.');
      }
      const normalizedSlug = slug?.trim() || undefined;
      const response = await authApi.login(email, password, normalizedSlug);

      localStorage.setItem('washsync_token', response.accessToken);

      const builtUser = buildUserFromToken(response.accessToken);
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
    if (isNativePushSupported() && !(await flushPendingNativePushRevocation())) {
      throw new Error('Revogação de notificações pendente. Verifique a conexão.');
    }
    const response = await authApi.signup(data);

    localStorage.setItem('washsync_token', response.accessToken);

    const builtUser = buildUserFromToken(response.accessToken);
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


const logout = useCallback(async () => {
  if (loggingOutRef.current) return;
  loggingOutRef.current = true;

  try {
    // Aguarda o término de uma sincronização automática
    // iniciada antes do logout.
    if (pendingPushSyncRef.current) {
      await pendingPushSyncRef.current;
    }

    await unregisterNativePushNotifications();
  } catch (error) {
    console.error(
      'Não foi possível desvincular o dispositivo das notificações:',
      error,
    );
  } finally {
    clearSessionStorage();
    setToken(null);
    setUser(null);
    setBusinessSlug(null);
    setNativePushStatus('unknown');
    loggingOutRef.current = false;
  }
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