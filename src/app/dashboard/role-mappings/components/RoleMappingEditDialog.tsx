'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Shield } from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { RoleMapping } from '@/types/api';
import { BACKEND_ROLES } from '@/constants/roles';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

interface RoleMappingEditDialogProps {
  roleMapping: RoleMapping;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleMappingEditDialog({ roleMapping, isOpen, onClose, onSuccess }: RoleMappingEditDialogProps) {
  const [formData, setFormData] = useState({
    auth0_role: roleMapping.auth0_role,
    backend_role: roleMapping.backend_role,
    description: roleMapping.description,
    is_active: roleMapping.is_active,
  });

  // Update mapping mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: {
      role_name?: string;
      permissions?: string[];
      description?: string;
      is_active?: boolean;
    } }) =>
      platformAdminApi.updateRoleMapping(id, data),
    onSuccess: () => {
      toast.success('Role mapping updated successfully');
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update role mapping'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: roleMapping.id,
      data: formData
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getRoleLabel = (backendRole: string) => {
    return BACKEND_ROLES.find(role => role.value === backendRole)?.label || backendRole;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Role Mapping">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-brand-navy/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-navy dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary">Edit Role Mapping</h3>
            <p className="text-sm text-text-secondary">
              Update the mapping between Auth0 and backend roles
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="auth0_role" className="block text-sm font-medium text-text-secondary mb-2">
              Auth0 Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="auth0_role"
              value={formData.auth0_role}
              onChange={(e) => handleInputChange('auth0_role', e.target.value)}
              className="input-field w-full"
              required
              placeholder="e.g., org_admin, member, etc."
            />
            <p className="mt-1 text-xs text-text-secondary">
              The role name as defined in Auth0
            </p>
          </div>

          <div>
            <label htmlFor="backend_role" className="block text-sm font-medium text-text-secondary mb-2">
              Backend Role <span className="text-red-500">*</span>
            </label>
            <select
              id="backend_role"
              value={formData.backend_role}
              onChange={(e) => handleInputChange('backend_role', e.target.value)}
              className="input-field w-full"
              required
            >
              {BACKEND_ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-secondary">
              Current: {getRoleLabel(formData.backend_role)}
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="input-field w-full"
              placeholder="Describe the purpose of this role mapping..."
            />
            <p className="mt-1 text-xs text-text-secondary">
              Optional description explaining this role mapping
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-text-secondary">
                Active
              </span>
            </label>
            <p className="mt-1 text-xs text-text-secondary ml-7">
              Only active mappings will be used for role assignment
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={updateMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Role Mapping'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
