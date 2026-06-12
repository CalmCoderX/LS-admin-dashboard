export interface MfaAuthenticator {
  id: string;
  authenticator_type: string;
  oob_channel?: string | null;
  name?: string | null;
  active?: boolean | null;
}

export interface CredentialMfaChallenge {
  mfaRequired: true;
  mfaEnrollmentRequired: boolean;
  mfaToken: string;
  authenticators: MfaAuthenticator[];
}

export interface MfaEnrollmentData {
  secret: string;
  barcodeUri: string;
  recoveryCodes: string[];
}

export function parseCredentialMfaChallenge(payload: unknown): CredentialMfaChallenge | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (!record.mfaRequired) {
    return null;
  }

  const data = record.data as Record<string, unknown> | undefined;
  const mfaToken = typeof data?.mfa_token === 'string' ? data.mfa_token : '';
  if (!mfaToken) {
    return null;
  }

  const authenticators = Array.isArray(data?.authenticators)
    ? (data.authenticators as MfaAuthenticator[])
    : [];

  return {
    mfaRequired: true,
    mfaEnrollmentRequired: Boolean(data?.mfa_enrollment_required),
    mfaToken,
    authenticators,
  };
}

export function buildMfaQrCodeUrl(barcodeUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(barcodeUri)}`;
}
