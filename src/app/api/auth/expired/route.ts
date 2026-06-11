import { NextResponse } from 'next/server';

import { clearAuthCookies } from '@/lib/auth-session';

/** Clears auth cookies and redirects to login when the session is expired. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  clearAuthCookies(response);
  return response;
}
