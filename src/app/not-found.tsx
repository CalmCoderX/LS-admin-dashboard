'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Shield } from 'lucide-react';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-navy rounded-full mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-6xl font-bold text-brand-navy mb-4">404</h1>

        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Page Not Found
        </h2>

        <p className="text-text-secondary mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          This might be because you don't have the required permissions
          or the URL is incorrect.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            href="/dashboard"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="mt-8 p-4 bg-bg-light-1 rounded-lg border border-bg-light-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-status-info mt-0.5" />
            <div className="text-left">
              <h3 className="font-medium text-text-primary text-sm">Need Help?</h3>
              <p className="text-xs text-text-secondary mt-1">
                If you believe you should have access to this page,
                please contact your system administrator or check
                your user permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
