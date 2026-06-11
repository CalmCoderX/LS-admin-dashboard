import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
} from '@/utils/auth-constants';

function clearVisibleAuthCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = `${AUTH_TOKEN_KEY}=; ${expired}`;
  document.cookie = `${USER_DATA_KEY}=; ${expired}`;
  document.cookie = `${REFRESH_TOKEN_KEY}=; ${expired}`;
}

export async function clearClientSession(options?: {
  redirect?: boolean;
  redirectTo?: string;
}): Promise<void> {
  const { redirect = true, redirectTo = '/login' } = options ?? {};

  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Ignore — still clear visible cookies below.
  }

  clearVisibleAuthCookies();

  if (redirect && typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}
