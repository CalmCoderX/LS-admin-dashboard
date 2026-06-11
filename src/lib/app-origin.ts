import { NextRequest } from 'next/server';

import { APP_ORIGIN } from '@/utils/auth-constants';

/**
 * Public origin for OAuth callbacks and redirects.
 * Prefer NEXT_PUBLIC_APP_URL (set in Amplify at build time), then proxy headers.
 */
export function getPublicAppOrigin(request: NextRequest): string {
  if (APP_ORIGIN) {
    return APP_ORIGIN;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    const host = forwardedHost.split(',')[0].trim();
    return `${proto}://${host}`;
  }

  const host = request.headers.get('host');
  if (host) {
    const proto = request.nextUrl.protocol.replace(':', '') || 'https';
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

export function getOAuthCallbackUrl(request: NextRequest): string {
  return `${getPublicAppOrigin(request)}/api/auth/oauth/callback`;
}

/** Build an absolute app URL (Amplify SSR may use localhost in request.url). */
export function buildAppUrl(request: NextRequest, pathname: string): URL {
  return new URL(pathname, `${getPublicAppOrigin(request)}/`);
}
