const CREDENTIAL_LOGIN_DISABLED_CODE = 'CREDENTIAL_LOGIN_DISABLED';

type ErrorPayload = {
  error?: {
    code?: string;
    details?: string;
  };
  message?: string;
};

export function isCredentialLoginDisabledError(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const data = payload as ErrorPayload;
  if (data.error?.code === CREDENTIAL_LOGIN_DISABLED_CODE) {
    return true;
  }

  const text = `${data.error?.details ?? ''} ${data.message ?? ''}`.toLowerCase();
  return (
    text.includes('does not support email and password') ||
    text.includes('does not support password reset') ||
    text.includes('single sign-on') ||
    text.includes('não suporta login com e-mail') ||
    text.includes('não suporta redefinição de senha')
  );
}

export function getCredentialAuthErrorMessage(
  payload: unknown,
  fallback: string
): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as ErrorPayload;
  if (typeof data.error?.details === 'string' && data.error.details.trim()) {
    return data.error.details;
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  return fallback;
}
