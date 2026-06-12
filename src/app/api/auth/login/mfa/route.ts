import { NextRequest, NextResponse } from 'next/server';

import { extractBackendErrorMessage } from '@/utils/error';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;
    const mfaToken = body?.mfa_token;
    const otp = body?.otp;

    if (!email || !mfaToken || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email, MFA token, and verification code are required' },
        { status: 400 }
      );
    }

    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login/mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, mfa_token: mfaToken, otp }),
    });

    const loginPayload = await loginResponse.json();

    if (!loginResponse.ok) {
      const message = extractBackendErrorMessage(loginPayload, 'Verification failed');
      return NextResponse.json(
        {
          success: false,
          message,
          error: loginPayload?.error ?? null,
        },
        { status: loginResponse.status }
      );
    }

    const tokens = loginPayload?.data;
    if (!tokens?.access_token) {
      return NextResponse.json(
        { success: false, message: 'Invalid login response' },
        { status: 500 }
      );
    }

    const user = await fetchCurrentUser(tokens.access_token);
    if (!user || !isAdminDashboardRole(user.role)) {
      const response = NextResponse.json(
        {
          success: false,
          message: 'Access denied. Admin role required.',
        },
        { status: 403 }
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: loginPayload?.message || 'Login successful',
      data: { user },
    });
    setAuthCookies(response, tokens, user);
    return response;
  } catch (error) {
    console.error('Admin MFA login failed:', error);
    return NextResponse.json(
      { success: false, message: 'Verification failed' },
      { status: 500 }
    );
  }
}
