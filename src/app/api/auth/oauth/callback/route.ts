import { NextRequest, NextResponse } from 'next/server';

import { buildAppUrl, getOAuthCallbackUrl } from '@/lib/app-origin';
import {
  clearAuthCookies,
  isAdminDashboardRole,
  setAuthCookies,
} from '@/lib/auth-session';
import { API_BASE_URL } from '@/utils/auth-constants';
import { User } from '@/types/api';

async function fetchCurrentUser(accessToken: string): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload?.data ?? null;
}

export async function GET(request: NextRequest) {
  const loginUrl = buildAppUrl(request, '/login');

  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError) {
    loginUrl.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(loginUrl);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    loginUrl.searchParams.set('error', 'oauth_missing');
    return NextResponse.redirect(loginUrl);
  }

  const callbackUrl = getOAuthCallbackUrl(request);

  const tokenResponse = await fetch(`${API_BASE_URL}/api/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code,
      state,
      redirect_uri: callbackUrl,
    }),
  });

  if (!tokenResponse.ok) {
    loginUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(loginUrl);
  }

  const tokenPayload = await tokenResponse.json();
  const tokens = tokenPayload?.data;

  if (!tokens?.access_token) {
    loginUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(loginUrl);
  }

  const user = await fetchCurrentUser(tokens.access_token);
  if (!user || !isAdminDashboardRole(user.role)) {
    loginUrl.searchParams.set('error', 'access_denied');
    const denied = NextResponse.redirect(loginUrl);
    clearAuthCookies(denied);
    return denied;
  }

  const response = NextResponse.redirect(buildAppUrl(request, '/dashboard'));
  setAuthCookies(response, tokens, user);
  return response;
}
