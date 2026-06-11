'use client';

import React from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import clsx from 'clsx';

export interface PageAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: PageAction[];
  showRefresh?: boolean;
  onRefresh?: () => void;
  /** When true, Refresh button shows spinner and is disabled. */
  isRefreshing?: boolean;
  /** Show a separate "Health check" button (e.g. engine management). */
  showHealthCheck?: boolean;
  onHealthCheck?: () => void;
  isHealthCheckLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const getActionButtonClass = (variant: PageAction['variant'] = 'secondary') => {
  const baseClass = 'flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  switch (variant) {
    case 'primary':
      return `${baseClass} btn-primary`;
    case 'danger':
      return `${baseClass} btn-danger`;
    case 'secondary':
    default:
      return `${baseClass} btn-secondary`;
  }
};

export default function PageHeader({
  title,
  description,
  actions = [],
  showRefresh = true,
  onRefresh,
  isRefreshing = false,
  showHealthCheck = false,
  onHealthCheck,
  isHealthCheckLoading = false,
  className,
  children
}: PageHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100">
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary mt-1">
            {description}
          </p>
        )}
        {children}
      </div>

      <div className="flex items-center gap-3 ml-6">
        {showRefresh && (
          <button
            onClick={onRefresh}
            className="btn-secondary flex items-center gap-2"
            disabled={!onRefresh || isRefreshing}
          >
            <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}

        {showHealthCheck && (
          <button
            onClick={onHealthCheck}
            className="btn-secondary flex items-center gap-2"
            disabled={!onHealthCheck || isHealthCheckLoading}
          >
            <Activity className={clsx('w-4 h-4', isHealthCheckLoading && 'animate-spin')} />
            {isHealthCheckLoading ? 'Checking health...' : 'Health check'}
          </button>
        )}

        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={getActionButtonClass(action.variant)}
            >
              {action.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                Icon && <Icon className="w-4 h-4" />
              )}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
