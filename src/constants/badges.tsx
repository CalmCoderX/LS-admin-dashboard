/**
 * Badge utilities and styling constants
 */

import React from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';
import type { User } from '@/types/api';
import clsx from 'clsx';

// Badge class names (used in globals.css)
export const BADGE_CLASSES = {
  success: 'badge-success',
  error: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
  secondary: 'badge-secondary',
} as const;

// Status color mappings
export const STATUS_COLORS = {
  // User statuses
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  invitation_sent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  
  // Engine/Health statuses
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  
  // Quota statuses
  exceeded: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  
  // Law Pack statuses
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  
  // Report/Task statuses
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  
  // Subscription statuses
  canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  past_due: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  trialing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  
  // Default/fallback
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
} as const;

/**
 * Get status badge for users
 */
export function getUserStatusBadge(user: User): JSX.Element {
  if (user.deleted_at || user.account_status === 'deleted') {
    return <span className="badge-error">Deleted</span>;
  }
  if (user.account_status === 'invitation_sent') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Invitation sent
      </span>
    );
  }
  if (!user.is_active || user.account_status === 'suspended') {
    return <span className="badge-warning">Suspended</span>;
  }
  return <span className="badge-success">Active</span>;
}

/**
 * Get status badge for quota based on percentage
 */
export function getQuotaStatusBadge(percentage: number): JSX.Element {
  if (percentage >= 100) return <span className="badge-error">Exceeded</span>;
  if (percentage >= 95) return <span className="badge-error">Critical</span>;
  if (percentage >= 80) return <span className="badge-warning">Warning</span>;
  return <span className="badge-success">Healthy</span>;
}

/**
 * Get status color for quota based on status string
 */
export function getQuotaStatusColor(status: string): string {
  switch (status) {
    case 'exceeded': 
      return 'text-status-error bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
    case 'warning': 
      return 'text-status-warning bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
    default: 
      return 'text-status-success bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
  }
}

/**
 * Get usage bar color for quota status
 */
export function getQuotaUsageBarColor(status: string): string {
  switch (status) {
    case 'exceeded': return 'bg-red-500';
    case 'warning': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
}

/**
 * Get status badge for law packs
 */
export function getLawPackStatusBadge(status: string): JSX.Element {
  const statusConfig = {
    active: { class: 'badge-success', icon: CheckCircle },
    draft: { class: 'badge-warning', icon: Clock },
    archived: { class: 'badge-error', icon: AlertTriangle },
    pending: { class: 'badge-info', icon: Clock },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <span className={`${config.class} flex items-center gap-1`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Get status badge for reports/tasks
 */
export function getReportStatusBadge(status: string): JSX.Element {
  const statusConfig: Record<string, { class: string; icon: any }> = {
    pending: { class: 'badge-secondary', icon: Clock },
    processing: { class: 'badge-info', icon: RefreshCw },
    completed: { class: 'badge-success', icon: CheckCircle },
    failed: { class: 'badge-error', icon: XCircle },
    cancelled: { class: 'badge-warning', icon: AlertTriangle },
  };
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={clsx(config.class, 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium')}>
      <Icon className="w-3 h-3 mr-1 inline" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Get status badge for activation codes
 */
export function getActivationCodeStatusBadge(code: { is_used: boolean; is_usable: boolean }): JSX.Element {
  if (code.is_used) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        <Activity className="w-3 h-3 mr-1" />
        Used
      </span>
    );
  } else if (code.is_usable) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Expired
      </span>
    );
  }
}

/**
 * Get status color for engines
 */
export function getEngineStatusColor(status: string, healthStatus?: string): string {
  if (status !== 'active') {
    return STATUS_COLORS.default;
  }

  switch (healthStatus) {
    case 'healthy':
      return STATUS_COLORS.healthy;
    case 'unhealthy':
      return STATUS_COLORS.unhealthy;
    case 'degraded':
      return STATUS_COLORS.degraded;
    default:
      return STATUS_COLORS.default;
  }
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-orange-500';
}

/**
 * Get generic status color from status string
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
}

