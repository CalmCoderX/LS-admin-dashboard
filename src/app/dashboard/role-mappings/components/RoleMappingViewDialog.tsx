'use client';

import Modal from '@/components/ui/Modal';
import { RoleMapping } from '@/types/api';
import { getBackendRoleColor, getBackendRoleLabel } from '@/constants/roles';
import { Shield } from 'lucide-react';
import clsx from 'clsx';

interface RoleMappingViewDialogProps {
  roleMapping: RoleMapping;
  isOpen: boolean;
  onClose: () => void;
}

export function RoleMappingViewDialog({ roleMapping, isOpen, onClose }: RoleMappingViewDialogProps) {

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="View Role Mapping">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-brand-navy/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-navy dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary">Role Mapping Details</h3>
            <p className="text-sm text-text-secondary">
              Mapping configuration between Auth0 and backend roles
            </p>
          </div>
        </div>

        {/* Role Mapping Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Auth0 Role
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <span className="font-mono text-sm text-text-primary">
                {roleMapping.auth0_role}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Backend Role
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <span className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getBackendRoleColor(roleMapping.backend_role)
              )}>
                {getBackendRoleLabel(roleMapping.backend_role)}
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <p className="text-sm text-text-primary">
                {roleMapping.description || 'No description provided'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <span className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                roleMapping.is_active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
              )}>
                {roleMapping.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Created Date
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <p className="text-sm text-text-primary">
                {new Date(roleMapping.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {roleMapping.updated_at && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Last Updated
              </label>
              <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
                <p className="text-sm text-text-primary">
                  {new Date(roleMapping.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
