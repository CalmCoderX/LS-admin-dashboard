'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isSuperAdmin) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, isSuperAdmin, router]);

  // Show loading screen while checking authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main to-bg-light-2 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-navy rounded-full mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Loading Admin Portal</h1>
        <p className="text-text-secondary">Please wait while we verify your credentials...</p>
      </div>
    </div>
  );
}
