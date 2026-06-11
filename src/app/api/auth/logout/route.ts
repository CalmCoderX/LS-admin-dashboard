import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearAuthCookies } from '@/lib/auth-session';
import { API_BASE_URL } from '@/utils/auth-constants';
import { REFRESH_TOKEN_KEY } from '@/utils/auth-constants';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          refresh_token: refreshToken,
          revoke_refresh_token: true,
        }),
      });
    } catch (error) {
      console.warn('Backend logout call failed:', error);
    }
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
