import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User, SignupDTO } from '@/types';
import { authApi } from '@/lib/api';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  businessId: string;
  exp?: number;
  iat?: number;
}

interface AuthContextType {
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
  logout: () => void;
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
  localStorage.removeItem('washhub_token');
  localStorage.removeItem('washhub_user');
  localStorage.removeItem('washhub_business_slug');
  localStorage.removeItem('branding');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('washhub_token');
    const savedBusinessSlug = localStorage.getItem('washhub_business_slug');

    if (savedToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(savedToken);
        const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : true;

        if (!isExpired) {
          const builtUser = buildUserFromToken(savedToken);
          setToken(savedToken);
          setUser(builtUser);
          setBusinessSlug(savedBusinessSlug || null);
          localStorage.setItem('washhub_user', JSON.stringify(builtUser));
        } else {
          clearSessionStorage();
        }
      } catch {
        clearSessionStorage();
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, slug?: string) => {
      const normalizedSlug = slug?.trim() || undefined;
      const response = await authApi.login(email, password, normalizedSlug);

      localStorage.setItem('washhub_token', response.accessToken);

      const builtUser = buildUserFromToken(response.accessToken);
      localStorage.setItem('washhub_user', JSON.stringify(builtUser));

      if (normalizedSlug) {
        localStorage.setItem('washhub_business_slug', normalizedSlug);
        setBusinessSlug(normalizedSlug);
      } else {
        localStorage.removeItem('washhub_business_slug');
        setBusinessSlug(null);
      }

      setToken(response.accessToken);
      setUser(builtUser);
    },
    [],
  );

  const signup = useCallback(async (data: SignupDTO) => {
    const response = await authApi.signup(data);

    localStorage.setItem('washhub_token', response.accessToken);

    const builtUser = buildUserFromToken(response.accessToken);
    localStorage.setItem('washhub_user', JSON.stringify(builtUser));

    if (data.businessSlug) {
      localStorage.setItem('washhub_business_slug', data.businessSlug);
      setBusinessSlug(data.businessSlug);
    } else {
      localStorage.removeItem('washhub_business_slug');
      setBusinessSlug(null);
    }

    setToken(response.accessToken);
    setUser(builtUser);
  }, []);

  const logout = useCallback(() => {
    clearSessionStorage();
    setToken(null);
    setUser(null);
    setBusinessSlug(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
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