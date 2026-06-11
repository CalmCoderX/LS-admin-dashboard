/**
 * Shared utilities for parsing and displaying backend API errors.
 */

interface ErrorWithResponse {
  response?: {
    data?: unknown;
    status?: number;
  };
}

interface ErrorWithDetail {
  detail?: string;
  status_code?: number;
}

interface ErrorWithMessage {
  message?: string;
}

export type ApiError =
  | ErrorWithResponse
  | ErrorWithDetail
  | ErrorWithMessage
  | string
  | null
  | undefined;

/**
 * Extract a user-facing message from a FastAPI backend response body.
 * Handles ErrorResponse ({ message, error: { code, details } }) and plain FastAPI shapes.
 */
export function extractBackendErrorMessage(
  errorData: unknown,
  fallback = 'An error occurred'
): string {
  if (!errorData || typeof errorData !== 'object') {
    return fallback;
  }

  const data = errorData as Record<string, unknown>;

  if (Array.isArray(data.detail)) {
    const items = data.detail as Array<{ loc?: (string | number)[]; msg?: string }>;
    if (items.length > 0) {
      return items
        .map(err => {
          const field = err.loc?.length ? err.loc[err.loc.length - 1] : 'field';
          return `${field}: ${err.msg ?? 'invalid'}`;
        })
        .join('; ');
    }
  }

  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }

  if (data.error !== null && data.error !== undefined && typeof data.error === 'object') {
    const errorObj = data.error as Record<string, unknown>;
    if (typeof errorObj.details === 'string' && errorObj.details.trim()) {
      return errorObj.details;
    }
    if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
      return errorObj.message;
    }
  }

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  return fallback;
}

/**
 * Extract error message from axios errors, BFF JSON responses, or interceptor ApiError objects.
 */
export const getErrorMessage = (error: ApiError, defaultMessage: string): string => {
  if (typeof error === 'string') {
    return error || defaultMessage;
  }

  if (!error) {
    return defaultMessage;
  }

  const hasResponse = (err: unknown): err is ErrorWithResponse =>
    err !== null && typeof err === 'object' && 'response' in err;

  if (hasResponse(error) && error.response?.data) {
    return extractBackendErrorMessage(error.response.data, defaultMessage);
  }

  if (typeof error === 'object' && 'detail' in error) {
    const detail = (error as ErrorWithDetail).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }

  if (typeof error === 'object' && 'message' in error) {
    const message = (error as ErrorWithMessage).message;
    if (typeof message === 'string' && message.trim() && message !== 'Network Error') {
      return message;
    }
  }

  return defaultMessage;
};

export const isValidationError = (error: ApiError): boolean => {
  if (!error || typeof error !== 'object') return false;
  const hasResponse = (err: unknown): err is ErrorWithResponse =>
    err !== null && typeof err === 'object' && 'response' in err;
  return hasResponse(error) && error.response?.status === 400;
};

export const isAuthorizationError = (error: ApiError): boolean => {
  if (!error || typeof error !== 'object') return false;
  const hasResponse = (err: unknown): err is ErrorWithResponse =>
    err !== null && typeof err === 'object' && 'response' in err;
  if (!hasResponse(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
};

export const isNotFoundError = (error: ApiError): boolean => {
  if (!error || typeof error !== 'object') return false;
  const hasResponse = (err: unknown): err is ErrorWithResponse =>
    err !== null && typeof err === 'object' && 'response' in err;
  return hasResponse(error) && error.response?.status === 404;
};

export const isServerError = (error: ApiError): boolean => {
  if (!error || typeof error !== 'object') return false;
  const hasResponse = (err: unknown): err is ErrorWithResponse =>
    err !== null && typeof err === 'object' && 'response' in err;
  if (!hasResponse(error)) return false;
  const status = error.response?.status;
  return status !== undefined && status >= 500;
};
