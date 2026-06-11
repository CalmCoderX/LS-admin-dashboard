'use client';

import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
  disableClose?: boolean; // Prevents closing via backdrop click or close button
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
  disableClose = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
          onClick={disableClose ? undefined : onClose}
        />

        {/* Modal */}
        <div className={clsx(
          'relative w-full transform transition-all',
          sizeClasses[size],
          className
        )}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-custom-lg">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-bg-light-6 dark:border-gray-700">
                {title && (
                  <h2 className="text-lg font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={disableClose ? undefined : onClose}
                    disabled={disableClose}
                    className={clsx(
                      "p-1 text-text-secondary transition-colors rounded-lg",
                      disableClose 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:text-text-primary hover:bg-bg-light-1 dark:hover:bg-gray-700"
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-gray-900 dark:text-gray-100">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
