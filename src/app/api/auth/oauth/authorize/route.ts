import { NextRequest, NextResponse } from 'next/server';

import { getOAuthCallbackUrl } from '@/lib/app-origin';
import { API_BASE_URL } from '@/utils/auth-constants';

/**
 * Start backend OAuth — redirects browser to FastAPI /auth/oauth/authorize,
 * which then redirects to Auth0.
 */
export async function GET(request: NextRequest) {
  const connection = request.nextUrl.searchParams.get('connection');
  const returnTo = request.nextUrl.searchParams.get('return_to') || '/dashboard';
  const callbackUrl = getOAuthCallbackUrl(request);

  const params = new URLSearchParams({
    redirect_uri: callbackUrl,
    return_to: returnTo,
    app: 'admin',
  });

  if (connection) {
    params.set('connection', connection);
  }

  const authorizeUrl = `${API_BASE_URL}/api/auth/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authorizeUrl);
}
