export const AUTH_TOKEN_KEY = 'lexashield-admin-auth-token';
export const REFRESH_TOKEN_KEY = 'lexashield-admin-refresh-token';
export const USER_DATA_KEY = 'lexashield-admin-user-data';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000';

/** Canonical admin app URL (no trailing slash). Required for OAuth on Amplify. */
export const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL || ''
).replace(/\/$/, '');
