'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Suspense, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: 0,
          refetchOnWindowFocus: true,
        },
        mutations: {
          retry: 0,
        },
      },
    })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <AuthProvider>
            {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600',
              style: {
                background: '#ffffff',
                color: '#111322',
                border: '1px solid #dcdcdc',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 6px -1px rgba(42, 47, 86, 0.1), 0 2px 4px -1px rgba(42, 47, 86, 0.06)',
              },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#3b82f6',
                secondary: '#ffffff',
              },
            },
          }}
        />
          </AuthProvider>
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
