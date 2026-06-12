'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';
import { extractBackendErrorMessage } from '@/utils/error';
import {
  getCredentialAuthErrorMessage,
  isCredentialLoginDisabledError,
} from '@/lib/credential-auth-errors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ssoOnlyNotice, setSsoOnlyNotice] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSsoOnlyNotice('');
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (isCredentialLoginDisabledError(payload)) {
          setSsoOnlyNotice(
            getCredentialAuthErrorMessage(
              payload,
              'Your organization does not support password reset. Please sign in with Google instead.'
            )
          );
          return;
        }
        throw new Error(extractBackendErrorMessage(payload, 'Failed to send reset email'));
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-navy rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <Image
              src={logoImage}
              alt="Lexa Shield Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">Lexa Shield</h2>
          <p className="text-text-secondary">Super Admin Dashboard</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-custom-lg p-8 border border-bg-light-6 dark:border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Forgot Password</h1>
            <p className="text-text-secondary text-sm">
              Enter your email and we&apos;ll send you a link to reset your password.
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

          {success ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                If an account exists for that email, a password reset link has been sent. Check your inbox.
              </div>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </form>
          )}

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand-navy dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                For security, we never confirm whether an email is registered. If you use Google sign-in only, password reset is not available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
