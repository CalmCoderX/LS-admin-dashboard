'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Shield } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';
import { extractBackendErrorMessage } from '@/utils/error';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset link is invalid or missing. Please request a new one.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(extractBackendErrorMessage(payload, 'Failed to reset password'));
      }

      router.push('/login?reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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
            <h1 className="text-2xl font-bold text-text-primary mb-2">Reset Password</h1>
            <p className="text-text-secondary text-sm">Enter your new password below.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {!token ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                This reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-text-primary">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-bg-light-6 bg-white py-3 pl-10 pr-3 text-sm text-text-primary outline-none focus:border-brand-navy dark:border-gray-600 dark:bg-gray-900"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-text-primary">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-bg-light-6 bg-white py-3 pl-10 pr-3 text-sm text-text-primary outline-none focus:border-brand-navy dark:border-gray-600 dark:bg-gray-900"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-bg-light-6 bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-light-1 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-4 flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand-navy dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
