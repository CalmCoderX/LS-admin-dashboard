'use client';

import React from 'react';
import {
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  Download,
  Settings,
  Crown,
  Package,
  MoreVertical,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

export type ActionType =
  | 'view'
  | 'edit'
  | 'delete'
  | 'restore'
  | 'download'
  | 'settings'
  | 'assign'
  | 'distribute'
  | 'more'
  | 'custom';

export interface ActionButton {
  type: ActionType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

export interface ActionButtonsProps {
  actions: ActionButton[];
  size?: 'sm' | 'md';
  className?: string;
  showLabels?: boolean;
}

const getActionIcon = (type: ActionType, customIcon?: React.ComponentType<{ className?: string }>) => {
  if (customIcon) return customIcon;

  switch (type) {
    case 'view':
      return Eye;
    case 'edit':
      return Edit;
    case 'delete':
      return Trash2;
    case 'restore':
      return RefreshCw;
    case 'download':
      return Download;
    case 'settings':
      return Settings;
    case 'assign':
      return Crown;
    case 'distribute':
      return Package;
    case 'more':
      return MoreVertical;
    default:
      return Edit;
  }
};

const getActionVariant = (type: ActionType, customVariant?: string) => {
  if (customVariant) return customVariant;

  switch (type) {
    case 'delete':
      return 'danger';
    case 'restore':
      return 'success';
    case 'download':
      return 'success';
    default:
      return 'default';
  }
};

const getVariantStyles = (variant: string, size: 'sm' | 'md') => {
  const baseStyles = 'transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeStyles = size === 'sm' ? 'p-1' : 'p-2';

  const variantStyles = {
    default: 'text-text-secondary hover:text-text-primary',
    danger: 'text-text-secondary hover:text-status-error',
    success: 'text-text-secondary hover:text-status-success',
    warning: 'text-text-secondary hover:text-status-warning'
  };

  return clsx(
    baseStyles,
    sizeStyles,
    variantStyles[variant as keyof typeof variantStyles] || variantStyles.default
  );
};

const getDefaultTooltip = (type: ActionType) => {
  switch (type) {
    case 'view':
      return 'View details';
    case 'edit':
      return 'Edit';
    case 'delete':
      return 'Delete';
    case 'restore':
      return 'Restore';
    case 'download':
      return 'Download';
    case 'settings':
      return 'Settings';
    case 'assign':
      return 'Assign';
    case 'distribute':
      return 'Distribute';
    case 'more':
      return 'More options';
    default:
      return '';
  }
};

export default function ActionButtons({
  actions,
  size = 'md',
  className,
  showLabels = false
}: ActionButtonsProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {actions.map((action, index) => {
        const Icon = getActionIcon(action.type, action.icon);
        const variant = getActionVariant(action.type, action.variant);
        const tooltip = action.tooltip || getDefaultTooltip(action.type);

        const buttonContent = (
          <>
            {action.loading ? (
              <Loader2 className={clsx(iconSize, 'animate-spin')} />
            ) : (
              <Icon className={iconSize} />
            )}
            {showLabels && action.label && (
              <span className="ml-1 text-sm">{action.label}</span>
            )}
          </>
        );

        return (
          <button
            key={`${action.type}-${index}`}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={getVariantStyles(variant, size)}
            title={tooltip}
            aria-label={tooltip}
          >
            {buttonContent}
          </button>
        );
      })}
    </div>
  );
}

// Pre-configured action button sets for common patterns
export function TableRowActions({
  onView,
  onEdit,
  onDelete,
  onRestore,
  isDeleted = false,
  className
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isDeleted?: boolean;
  className?: string;
}) {
  const actions: ActionButton[] = [];

  if (onView) {
    actions.push({ type: 'view', onClick: onView });
  }

  if (onEdit && !isDeleted) {
    actions.push({ type: 'edit', onClick: onEdit });
  }

  if (isDeleted && onRestore) {
    actions.push({ type: 'restore', onClick: onRestore });
  }

  if (onDelete) {
    actions.push({
      type: 'delete',
      onClick: onDelete,
      icon: isDeleted ? AlertTriangle : Trash2,
      tooltip: isDeleted ? 'Permanently delete' : 'Delete'
    });
  }

  return <ActionButtons actions={actions} className={className} />;
}
