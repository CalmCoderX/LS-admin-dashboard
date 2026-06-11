'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import { User, UserRole } from '@/types/api';
import { userApi, clearSessionTokenGetter } from '@/lib/api';
import { clearClientSession } from '@/lib/clear-client-session';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
} from '@/utils/auth-constants';
import { extractBackendErrorMessage } from '@/utils/error';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  loginWithGoogle: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function isAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PLATFORM_ADMIN;
}

function isAuthError(error: unknown): boolean {
  const statusCode = (error as { status_code?: number })?.status_code;
  return statusCode === 401 || statusCode === 403;
}

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie
    .split('; ')
    .some(row => row.startsWith(`${AUTH_TOKEN_KEY}=`));
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const bootstrapSession = useCallback(async () => {
    if (!hasSessionCookie()) {
      clearSessionTokenGetter();
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!sessionResponse.ok) {
        await clearClientSession({ redirect: false });
        clearSessionTokenGetter();
        setUser(null);
        return;
      }

      const sessionData = await sessionResponse.json();
      if (!sessionData?.authenticated || !sessionData?.user) {
        await clearClientSession({ redirect: false });
        clearSessionTokenGetter();
        setUser(null);
        return;
      }

      if (!isAdminRole(sessionData.user.role)) {
        toast.error('Access denied. Admin role required.');
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        await clearClientSession({ redirect: false });
        clearSessionTokenGetter();
        setUser(null);
        return;
      }

      try {
        const userData = await userApi.getMe();
        if (!isAdminRole(userData.role)) {
          throw new Error('Access denied');
        }
        setUser(userData);
      } catch (error) {
        if (isAuthError(error)) {
          await clearClientSession({ redirect: false });
          clearSessionTokenGetter();
          setUser(null);
        } else {
          setUser(sessionData.user);
        }
      }
    } catch (error) {
      console.error('Session bootstrap failed:', error);
      clearSessionTokenGetter();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    const error = searchParams?.get('error');
    if (!error || pathname !== '/login') {
      return;
    }

    const messages: Record<string, string> = {
      oauth_denied: 'Sign-in was cancelled or denied.',
      oauth_missing: 'Sign-in response was incomplete. Please try again.',
      oauth_failed: 'Sign-in failed. Please try again.',
      access_denied: 'Access denied. Admin role required.',
    };
    toast.error(messages[error] || 'Authentication failed. Please try again.');
  }, [searchParams, pathname]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const publicPaths = ['/login', '/forgot-password', '/reset-password'];

    if (!isAuthenticated && pathname?.startsWith('/dashboard')) {
      router.push('/login');
    } else if (isAuthenticated && publicPaths.includes(pathname || '')) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const loginWithGoogle = () => {
    const params = new URLSearchParams({
      return_to: '/dashboard',
      connection: 'google-oauth2',
    });
    window.location.href = `/api/auth/oauth/authorize?${params.toString()}`;
  };

  const loginWithCredentials = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(payload, 'Login failed'));
    }

    const loggedInUser = payload?.data?.user as User | undefined;
    if (!loggedInUser || !isAdminRole(loggedInUser.role)) {
      throw new Error('Access denied. Admin role required.');
    }

    setUser(loggedInUser);
    toast.success(`Welcome, ${loggedInUser.name}!`);
    router.push('/dashboard');
  };

  const logout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    clearSessionTokenGetter();
    setUser(null);

    if (typeof document !== 'undefined') {
      document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${USER_DATA_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    toast.success('Successfully logged out');
    router.replace('/login');
  };

  useEffect(() => {
    if (pathname === '/login') {
      setIsLoggingOut(false);
    }
  }, [pathname]);

  const refreshUser = async () => {
    await bootstrapSession();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggingOut,
    isAuthenticated,
    isSuperAdmin,
    loginWithGoogle,
    loginWithCredentials,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
