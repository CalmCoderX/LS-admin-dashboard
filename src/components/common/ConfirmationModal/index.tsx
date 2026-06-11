'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  CheckCircle,
  Info,
  XCircle,
  Loader2
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type?: ConfirmationType;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;

  // Enhanced options for complex confirmations
  itemName?: string;
  consequences?: string[];
  requiresConfirmation?: boolean; // For destructive actions, requires typing confirmation
  confirmationText?: string; // Text user must type to confirm

  // Custom styling
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
}

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmButton: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    confirmButton: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white'
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmButton: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    confirmButton: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white'
  }
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  itemName,
  consequences = [],
  requiresConfirmation = false,
  confirmationText = 'DELETE',
  size = 'md',
  icon: CustomIcon
}: ConfirmationModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const config = typeConfig[type];
  const Icon = CustomIcon || config.icon;

  const canConfirm = requiresConfirmation
    ? confirmationInput.trim().toUpperCase() === confirmationText.toUpperCase()
    : true;

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmationInput('');
    onClose();
  };

  // Reset confirmation input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={size} title={title}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={clsx(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            config.iconBg
          )}>
            <Icon className={clsx('w-6 h-6', config.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </p>

            {/* Item Name */}
            {itemName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Item:</span> {itemName}
                </p>
              </div>
            )}

            {/* Consequences */}
            {consequences.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  This action will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {consequences.map((consequence, index) => (
                    <li key={index}>{consequence}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmation Input */}
            {requiresConfirmation && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Type <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-xs">
                    {confirmationText}
                  </code> to confirm this action:
                </p>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className="input-field w-full"
                  placeholder={`Type "${confirmationText}" here`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2',
              config.confirmButton
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Pre-configured confirmation types
export function DeleteConfirmationModal(props: Omit<ConfirmationModalProps, 'type' | 'icon'>) {
  return (
    <ConfirmationModal
      {...props}
      type="danger"
      icon={Trash2}
      confirmLabel={props.confirmLabel || 'Delete'}
    />
  );
}

export function RestoreConfirmationModal(props: Omit<ConfirmationModalProps, 'type' | 'icon'>) {
  return (
    <ConfirmationModal
      {...props}
      type="success"
      icon={RefreshCw}
      confirmLabel={props.confirmLabel || 'Restore'}
    />
  );
}

export function DestructiveConfirmationModal(props: Omit<ConfirmationModalProps, 'requiresConfirmation' | 'type'>) {
  return (
    <ConfirmationModal
      {...props}
      type="danger"
      requiresConfirmation={true}
      confirmationText={props.confirmationText || "PERMANENTLY DELETE"}
    />
  );
}

// Convenience hook for confirmation modals
export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Partial<ConfirmationModalProps>>({});

  const open = (modalConfig: Partial<ConfirmationModalProps>) => {
    setConfig(modalConfig);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setIsLoading(false);
    setConfig({});
  };

  const confirm = async (onConfirm?: () => Promise<void> | void) => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
        close();
      } catch (error) {
        console.error('Confirmation action error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirm,
    config: {
      ...config,
      isOpen,
      onClose: close,
      isLoading
    }
  };
}
