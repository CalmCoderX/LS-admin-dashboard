import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
} from '@/utils/auth-constants';
import { User, UserRole } from '@/types/api';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function isAdminDashboardRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function setAuthCookies(
  response: NextResponse,
  tokens: { access_token: string; refresh_token?: string },
  user: User
): void {
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(AUTH_TOKEN_KEY, tokens.access_token, {
    maxAge: COOKIE_MAX_AGE,
    secure,
    sameSite: 'lax',
    path: '/',
  });

  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_KEY, tokens.refresh_token, {
      maxAge: COOKIE_MAX_AGE,
      secure,
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
    });
  }

  response.cookies.set(
    USER_DATA_KEY,
    JSON.stringify({ data: user }),
    {
      maxAge: COOKIE_MAX_AGE,
      secure,
      sameSite: 'lax',
      path: '/',
    }
  );
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(AUTH_TOKEN_KEY);
  response.cookies.delete(REFRESH_TOKEN_KEY);
  response.cookies.delete(USER_DATA_KEY);
}

export async function readAuthTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_KEY)?.value ?? null;
}
