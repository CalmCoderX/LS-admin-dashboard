import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearAuthCookies, setAuthCookies } from '@/lib/auth-session';
import { API_BASE_URL } from '@/utils/auth-constants';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
} from '@/utils/auth-constants';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value;
  const userDataRaw = cookieStore.get(USER_DATA_KEY)?.value;

  if (!refreshToken) {
    const response = NextResponse.json(
      { success: false, message: 'No refresh token' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await refreshResponse.json();

  if (!refreshResponse.ok || !payload?.data?.access_token) {
    const response = NextResponse.json(
      { success: false, message: 'Token refresh failed' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }

  const tokens = payload.data;
  const response = NextResponse.json({
    success: true,
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
    },
  });

  // Preserve existing user cookie data
  let user = null;
  if (userDataRaw) {
    try {
      user = JSON.parse(userDataRaw)?.data;
    } catch {
      user = null;
    }
  }

  if (user) {
    setAuthCookies(response, tokens, user);
  } else {
    response.cookies.set(AUTH_TOKEN_KEY, tokens.access_token, {
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    if (tokens.refresh_token) {
      response.cookies.set(REFRESH_TOKEN_KEY, tokens.refresh_token, {
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
      });
    }
  }

  return response;
}
