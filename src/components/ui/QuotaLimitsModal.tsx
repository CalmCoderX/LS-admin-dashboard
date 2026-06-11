'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface QuotaData {
  quota_type: string;
  limit: number;
  custom_limit?: number;
  effective_limit: number;
  used: number;
  usage_percent: number;
}

interface QuotaLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  quotas: QuotaData[];
  onSave: (updates: { [quotaType: string]: number | null }) => void;
  isLoading: boolean;
  orgId: number;
}

export default function QuotaLimitsModal({
  isOpen,
  onClose,
  organizationName,
  quotas,
  onSave,
  isLoading,
  orgId,
}: QuotaLimitsModalProps) {
  const [customLimits, setCustomLimits] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && quotas) {
      const initialLimits: { [key: string]: string } = {};
      quotas.forEach(quota => {
        initialLimits[quota.quota_type] = quota.custom_limit?.toString() || '';
      });
      setCustomLimits(initialLimits);
    }
  }, [isOpen, quotas]);

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all numeric inputs
    const validationErrors: { [key: string]: string } = {};
    const updates: { [quotaType: string]: number | null } = {};

    Object.entries(customLimits).forEach(([quotaType, value]) => {
      if (value.trim() !== '') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          validationErrors[quotaType] = 'Must be a valid positive number';
          return;
        }
        updates[quotaType] = numValue;
      } else {
        updates[quotaType] = null;
      }
    });

    // If there are validation errors, set them and don't submit
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear errors and submit
    setErrors({});
    onSave(updates);
  };

  const handleClose = () => {
    setCustomLimits({});
    onClose();
  };

  const handleLimitChange = (quotaType: string, value: string) => {
    setCustomLimits(prev => ({
      ...prev,
      [quotaType]: value
    }));

    // Clear error when user starts typing
    if (errors[quotaType]) {
      setErrors(prev => ({
        ...prev,
        [quotaType]: ''
      }));
    }
  };

    return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Quota Limits - ${organizationName}`}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {quotas && quotas.length > 0 ? (
            <div className="space-y-4">
              {quotas.map((quota) => (
                <div key={quota.quota_type} className="border border-bg-light-6 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-text-primary capitalize">
                      {quota.quota_type.replace('_', ' ')}
                    </h4>
                    <span className="text-sm text-text-secondary">
                      Current: {quota.used || 0} / {quota.effective_limit || quota.limit || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Default Limit
                      </label>
                      <input
                        type="number"
                        value={quota.limit || 0}
                        disabled
                        className="w-full px-3 py-2 border border-bg-light-6 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Custom Limit
                      </label>
                      <input
                        type="number"
                        value={customLimits[quota.quota_type] || ''}
                        onChange={(e) => handleLimitChange(quota.quota_type, e.target.value)}
                        placeholder="Leave empty for default"
                        className={`input-field ${errors[quota.quota_type] ? 'border-red-500' : ''}`}
                        disabled={isLoading}
                        min="0"
                      />
                      {errors[quota.quota_type] && (
                        <p className="text-sm text-red-600 mt-1">{errors[quota.quota_type]}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (quota.usage_percent || 0) > 90 ? 'bg-status-error' :
                          (quota.usage_percent || 0) > 75 ? 'bg-status-warning' :
                          'bg-status-success'
                        }`}
                        style={{ width: `${Math.min(quota.usage_percent || 0, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {quota.usage_percent || 0}% used
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-text-secondary">No quotas found for this organization</p>
            </div>
          )}

                  <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
