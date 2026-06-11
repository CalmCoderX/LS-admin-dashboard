'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-status-error rounded-full mb-6">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Something went wrong!
        </h1>

        <p className="text-text-secondary mb-6 leading-relaxed">
          We encountered an unexpected error while loading the page.
          This issue has been logged and our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left bg-bg-light-1 p-4 rounded-lg mb-6 border border-bg-light-6">
            <summary className="cursor-pointer font-medium text-sm mb-2 text-text-primary">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-status-error whitespace-pre-wrap font-mono">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-info mt-0.5" />
            <div className="text-left">
              <h3 className="font-medium text-text-primary text-sm">Need Immediate Help?</h3>
              <p className="text-xs text-text-secondary mt-1">
                If this error persists, please contact the system administrator
                with the error details and the actions you were trying to perform.
              </p>
              {error.digest && (
                <p className="text-xs text-text-secondary mt-2 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
