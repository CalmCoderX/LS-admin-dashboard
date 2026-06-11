import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearAuthCookies } from '@/lib/auth-session';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
} from '@/utils/auth-constants';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_KEY)?.value;
  const userData = cookieStore.get(USER_DATA_KEY)?.value;

  if (!token || !userData) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const parsed = JSON.parse(userData);
    return NextResponse.json({
      authenticated: true,
      user: parsed?.data ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
