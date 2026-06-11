'use client';

import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  RefreshCw,
  Crown,
  Star
} from 'lucide-react';
import clsx from 'clsx';

export type StatusVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'pending'
  | 'processing'
  | 'featured';

export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: StatusSize;
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

const getStatusVariant = (status: string): StatusVariant => {
  const normalizedStatus = status.toLowerCase().replace(/[-_\s]/g, '');

  switch (normalizedStatus) {
    case 'active':
    case 'completed':
    case 'healthy':
    case 'success':
      return 'success';

    case 'inactive':
    case 'failed':
    case 'error':
    case 'unhealthy':
    case 'deleted':
    case 'suspended':
    case 'canceled':
    case 'cancelled':
      return 'error';

    case 'pending':
    case 'pastdue':
    case 'warning':
      return 'warning';

    case 'inprogress':
    case 'processing':
    case 'loading':
      return 'processing';

    case 'trialing':
    case 'trial':
    case 'info':
      return 'info';

    case 'featured':
    case 'premium':
      return 'featured';

    default:
      return 'neutral';
  }
};

const getVariantStyles = (variant: StatusVariant, size: StatusSize) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  const variantStyles = {
    success: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    neutral: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300',
    pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
    processing: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    featured: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
  };

  return clsx(baseStyles, sizeStyles[size], variantStyles[variant]);
};

const getStatusIcon = (variant: StatusVariant, size: StatusSize) => {
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

  switch (variant) {
    case 'success':
      return <CheckCircle className={iconSize} />;
    case 'error':
      return <XCircle className={iconSize} />;
    case 'warning':
      return <AlertTriangle className={iconSize} />;
    case 'pending':
      return <Clock className={iconSize} />;
    case 'processing':
      return <RefreshCw className={clsx(iconSize, 'animate-spin')} />;
    case 'featured':
      return <Star className={iconSize} />;
    case 'info':
      return <AlertTriangle className={iconSize} />;
    case 'neutral':
      return <Ban className={iconSize} />;
    default:
      return null;
  }
};

const formatStatusLabel = (status: string): string => {
  return status
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/In Progress/i, 'In Progress')
    .replace(/Past Due/i, 'Past Due');
};

export default function StatusBadge({
  status,
  variant,
  size = 'md',
  showIcon = true,
  className,
  onClick
}: StatusBadgeProps) {
  const resolvedVariant = variant || getStatusVariant(status);
  const icon = showIcon ? getStatusIcon(resolvedVariant, size) : null;
  const label = formatStatusLabel(status);

  const badgeClass = clsx(
    getVariantStyles(resolvedVariant, size),
    onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
    className
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={badgeClass}>
        {icon}
        {label}
      </button>
    );
  }

  return (
    <span className={badgeClass}>
      {icon}
      {label}
    </span>
  );
}

// Convenience components for common use cases
export function UserStatusBadge({ isActive, isDeleted, ...props }: {
  isActive?: boolean;
  isDeleted?: boolean;
} & Omit<StatusBadgeProps, 'status'>) {
  const status = isDeleted ? 'deleted' : isActive ? 'active' : 'inactive';
  return <StatusBadge status={status} {...props} />;
}

export function HealthStatusBadge({ health, isActive, ...props }: {
  health?: string;
  isActive?: boolean;
} & Omit<StatusBadgeProps, 'status'>) {
  const status = !isActive ? 'inactive' : health || 'unknown';
  return <StatusBadge status={status} {...props} />;
}
