'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, Ban } from 'lucide-react';
import Modal from './Modal';

interface SoftDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
  consequences?: string[];
}

export function SoftDeletionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
  consequences = []
}: SoftDeletionDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={title}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <b className="text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </b>

            {itemName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Item to delete:</span> {itemName}
                </p>
              </div>
            )}

            {consequences.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What will happen:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {consequences.map((consequence, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{consequence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This is a soft deletion. The item will be hidden but can be restored later if needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface PermanentDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
  consequences?: string[];
  requiresConfirmation?: boolean;
}

export function PermanentDeletionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
  consequences = [],
  requiresConfirmation = true
}: PermanentDeletionDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  // Reset state when dialog closes or opens
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setStep('warning');
    }
  }, [isOpen]);

  const handleClose = () => {
    setConfirmText('');
    setStep('warning');
    onClose();
  };

  const handleNext = () => {
    if (step === 'warning') {
      setStep('confirm');
    } else if (step === 'confirm') {
      onConfirm();
    }
  };

  const canProceed = !requiresConfirmation || confirmText === 'DELETE';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" title={title}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <b className="text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </b>

            {itemName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Item to permanently delete:</span> {itemName}
                </p>
              </div>
            )}

            {consequences.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What will happen:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {consequences.map((consequence, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{consequence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    ⚠️ This action cannot be undone!
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This will permanently delete the item and all associated data from the system.
                  </p>
                </div>
              </div>
            </div>

            {step === 'confirm' && requiresConfirmation && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Type <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-red-600 dark:text-red-400">DELETE</code> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={step === 'confirm' ? () => setStep('warning') : handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading || (step === 'confirm' && !canProceed)}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : step === 'warning' ? (
              <>
                Continue
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Permanently Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface RestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
}

interface SuspendConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
  consequences?: string[];
  isHighRisk?: boolean;
}

export function SuspendConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
  consequences = [],
  isHighRisk = false,
}: SuspendConfirmationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={title}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <b className="text-gray-600 dark:text-gray-300 mb-4">{description}</b>

            {itemName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Target:</span> {itemName}
                </p>
              </div>
            )}

            {consequences.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What will happen:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {consequences.map((consequence, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{consequence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isHighRisk && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    This is a high-risk action. Confirm only if you intend to revoke access immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Suspending...
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                Suspend
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function RestoreDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false
}: RestoreDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </p>

            {itemName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Item to restore:</span> {itemName}
                </p>
              </div>
            )}

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  This will make the item active and visible again.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Restoring...
              </>
            ) : (
              <>
                Restore
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
