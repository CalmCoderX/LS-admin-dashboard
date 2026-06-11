'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render theme-specific content until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className={clsx(
          'relative p-2 rounded-lg transition-all duration-300 hover:bg-bg-light-1 dark:hover:bg-gray-700',
          'border border-bg-light-6 dark:border-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-brand-navy dark:focus:ring-blue-400'
        )}
      >
        <div className="relative w-5 h-5">
          <Sun className="absolute inset-0 w-5 h-5 transition-all duration-300 text-yellow-500 opacity-100 rotate-0 scale-100" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'relative p-2 rounded-lg transition-all duration-300 hover:bg-bg-light-1 dark:hover:bg-gray-700',
        'border border-bg-light-6 dark:border-gray-600',
        'focus:outline-none focus:ring-2 focus:ring-brand-navy dark:focus:ring-blue-400'
      )}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={clsx(
            'absolute inset-0 w-5 h-5 transition-all duration-300 text-yellow-500',
            theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          )}
        />
        <Moon
          className={clsx(
            'absolute inset-0 w-5 h-5 transition-all duration-300 text-blue-400',
            theme === 'light' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          )}
        />
      </div>
    </button>
  );
}
