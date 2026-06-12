'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Shield, LogIn, Lock, UserCheck, Mail, Loader2, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OTPInput from '@/components/ui/OTPInput';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import logoImage from '@/assets/images/logo.png';
import {
  getCredentialAuthErrorMessage,
  isCredentialLoginDisabledError,
} from '@/lib/credential-auth-errors';
import {
  buildMfaQrCodeUrl,
  CredentialMfaChallenge,
  MfaEnrollmentData,
} from '@/lib/credential-mfa';

export default function LoginPage() {
  const {
    loginWithGoogle,
    loginWithCredentials,
    completeMfaLogin,
    startMfaEnrollment,
    isAuthenticated,
    isLoading,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState<CredentialMfaChallenge | null>(null);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollmentData | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mfaNotice, setMfaNotice] = useState('');
  const [ssoOnlyNotice, setSsoOnlyNotice] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (searchParams?.get('reset') === 'success') {
      toast.success('Password reset successfully. You can sign in with your new password.');
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    setGoogleSubmitting(true);
    loginWithGoogle();
  };

  const isAuthActionPending = submitting || googleSubmitting || mfaSubmitting || enrollingMfa;
  const showMfaEnrollment = Boolean(mfaChallenge?.mfaEnrollmentRequired || mfaEnrollment);

  useEffect(() => {
    if (!mfaChallenge?.mfaEnrollmentRequired || mfaEnrollment) {
      return;
    }

    let cancelled = false;
    setEnrollingMfa(true);
    setError('');

    startMfaEnrollment(mfaChallenge.mfaToken)
      .then(enrollment => {
        if (cancelled) {
          return;
        }
        setMfaEnrollment(enrollment);
        setMfaNotice(
          'Scan the QR code with Google Authenticator, Authy, or another authenticator app, then enter the 6-digit code.'
        );
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start MFA setup');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEnrollingMfa(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mfaChallenge, mfaEnrollment, startMfaEnrollment]);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMfaNotice('');
    setSsoOnlyNotice('');
    setMfaEnrollment(null);
    setSubmitting(true);
    try {
      const result = await loginWithCredentials(email.trim(), password);
      if (result.status === 'mfa_required') {
        setMfaChallenge(result);
        setMfaCode('');
        if (result.mfaEnrollmentRequired) {
          setMfaNotice('Set up an authenticator app to continue.');
        } else {
          setMfaNotice('Enter the 6-digit code from your authenticator app.');
        }
      }
    } catch (err) {
      const serverResponse =
        err && typeof err === 'object' && 'serverResponse' in err
          ? (err as { serverResponse?: unknown }).serverResponse
          : undefined;

      if (isCredentialLoginDisabledError(serverResponse)) {
        setSsoOnlyNotice(
          getCredentialAuthErrorMessage(
            serverResponse,
            'Your organization does not support email and password sign-in. Please use Google sign-in instead.'
          )
        );
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const verifyInFlight = useRef(false);

  const handleMfaVerify = useCallback(
    async (code: string) => {
      if (!mfaChallenge || verifyInFlight.current || mfaSubmitting) {
        return;
      }

      verifyInFlight.current = true;
      setError('');
      setMfaSubmitting(true);
      try {
        await completeMfaLogin(email.trim(), mfaChallenge.mfaToken, code.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
        setMfaCode('');
      } finally {
        setMfaSubmitting(false);
        verifyInFlight.current = false;
      }
    },
    [completeMfaLogin, email, mfaChallenge, mfaSubmitting]
  );

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleMfaVerify(mfaCode);
  };

  const handleBackToPassword = () => {
    setMfaChallenge(null);
    setMfaEnrollment(null);
    setMfaCode('');
    setMfaNotice('');
    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 dark:from-gray-900 dark:to-gray-800">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-navy to-brand-blue-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center overflow-hidden">
                  <Image
                    src={logoImage}
                    alt="Lexa Shield Logo"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Lexa Shield</h2>
                  <p className="text-blue-100 text-sm">Admin Platform</p>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-4">Super Admin Dashboard</h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Comprehensive platform management with advanced security,
                user control, and system monitoring capabilities.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-blue-200" />
                <span className="text-blue-100">Role-based Access Control</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-200" />
                <span className="text-blue-100">Advanced Security Features</span>
              </div>
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-200" />
                <span className="text-blue-100">SSO & Credential Sign-in</span>
              </div>
            </div>
          </div>

          <div className="absolute top-20 right-20 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
          <div className="absolute bottom-32 right-32 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-lg"></div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-brand-navy rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <Image
                  src={logoImage}
                  alt="Lexa Shield Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Lexa Shield</h2>
                <h1 className="text-lg font-medium text-text-secondary">Super Admin Dashboard</h1>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-custom-lg p-8 border border-bg-light-6 dark:border-gray-700">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome Back</h2>
                <p className="text-text-secondary">
                  Sign in with email and password or Google
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              {ssoOnlyNotice && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                  {ssoOnlyNotice}
                </div>
              )}

              {mfaNotice && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                  {mfaNotice}
                </div>
              )}

              {mfaChallenge ? (
                <form onSubmit={handleMfaSubmit} className="space-y-4 mb-6">
                  {showMfaEnrollment && (
                    <div className="space-y-3 rounded-lg border border-bg-light-6 bg-bg-light-1 p-4 dark:border-gray-600 dark:bg-gray-900">
                      <p className="text-sm font-medium text-text-primary">
                        {enrollingMfa ? 'Preparing authenticator setup...' : 'Set up authenticator app'}
                      </p>
                      {enrollingMfa && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
                        </div>
                      )}
                      {mfaEnrollment && (
                        <>
                          <div className="flex justify-center">
                            <img
                              src={buildMfaQrCodeUrl(mfaEnrollment.barcodeUri)}
                              alt="Authenticator app QR code"
                              width={200}
                              height={200}
                              className="rounded-lg border border-bg-light-6 bg-white p-2 dark:border-gray-600"
                            />
                          </div>
                          <p className="text-xs text-text-secondary break-all">
                            Or enter this key manually:{' '}
                            <span className="font-mono text-text-primary">{mfaEnrollment.secret}</span>
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">
                      Authenticator code
                    </label>
                    <OTPInput
                      value={mfaCode}
                      onChange={code => {
                        setMfaCode(code);
                        if (error) {
                          setError('');
                        }
                      }}
                      onComplete={handleMfaVerify}
                      disabled={
                        mfaSubmitting ||
                        (showMfaEnrollment && !mfaEnrollment)
                      }
                      autoFocus={!showMfaEnrollment || Boolean(mfaEnrollment)}
                      hasError={Boolean(error)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isAuthActionPending ||
                      mfaCode.length < 6 ||
                      (showMfaEnrollment && !mfaEnrollment)
                    }
                    className="w-full flex items-center justify-center gap-3 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    {mfaSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                    {mfaSubmitting
                      ? 'Verifying...'
                      : showMfaEnrollment
                        ? 'Complete setup and sign in'
                        : 'Verify and sign in'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToPassword}
                    disabled={isAuthActionPending}
                    className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to password sign-in
                  </button>
                </form>
              ) : (
              <form onSubmit={handleCredentialLogin} className="space-y-4 mb-6">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-primary">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-bg-light-6 bg-white py-3 pl-10 pr-3 text-sm text-text-primary outline-none focus:border-brand-navy dark:border-gray-600 dark:bg-gray-900"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-brand-navy hover:underline dark:text-blue-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-bg-light-6 bg-white py-3 pl-10 pr-3 text-sm text-text-primary outline-none focus:border-brand-navy dark:border-gray-600 dark:bg-gray-900"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthActionPending}
                  className="w-full flex items-center justify-center gap-3 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              )}

              {!mfaChallenge && (
              <>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-bg-light-6 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-text-secondary dark:bg-gray-800">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAuthActionPending}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {googleSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon className="h-5 w-5" />
                )}
                {googleSubmitting ? 'Redirecting to Google...' : 'Sign in with Google'}
              </button>
              </>
              )}

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-brand-navy dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-brand-navy dark:text-blue-400 text-sm">Security Notice</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      This dashboard is restricted to authorized super administrators only.
                      All access attempts are logged and monitored for security purposes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-text-secondary">
              <p>© 2026 Super Admin Dashboard. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
