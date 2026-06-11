'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (!isSuperAdmin) {
        // Redirect non-super-admin users
        router.push('/login');
        return;
      }
    }
  }, [isAuthenticated, isLoading, isSuperAdmin, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto"></div>
          <p className="text-text-secondary mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated or not super admin
  if (!isAuthenticated || !isSuperAdmin) {
    return null;
  }

  return children;
}
