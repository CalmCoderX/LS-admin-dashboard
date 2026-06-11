import { NextRequest, NextResponse } from 'next/server';

import { buildAppUrl } from '@/lib/app-origin';
import { clearAuthCookies } from '@/lib/auth-session';

/** Clears auth cookies and redirects to login when the session is expired. */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(buildAppUrl(request, '/login'));
  clearAuthCookies(response);
  return response;
}
