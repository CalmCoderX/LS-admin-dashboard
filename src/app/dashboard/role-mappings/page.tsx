'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { RoleMapping, RoleMappingListResponse } from '@/types/api';
import { getBackendRoleColor, getBackendRoleLabel } from '@/constants/roles';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RoleMappingViewDialog } from './components/RoleMappingViewDialog';
import { RoleMappingEditDialog } from './components/RoleMappingEditDialog';
import clsx from 'clsx';

export default function RoleMappingsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [selectedRoleMapping, setSelectedRoleMapping] = useState<RoleMapping | null>(null);
  const [dialogType, setDialogType] = useState<'edit' | 'view' | null>(null);

  // Fetch role mappings (only active ones)
  const { data: mappingsData, isLoading: isLoadingRoleMappings, error, isRefetching: isRefetchingRoleMappings } = useQuery({
    queryKey: ['role-mappings'],
    queryFn: async () => {
      return platformAdminApi.getRoleMappings();
    },
    refetchOnWindowFocus: false
  });

  const handleEdit = (roleMapping: RoleMapping) => {
    setSelectedRoleMapping(roleMapping);
    setDialogType('edit');
  };

  const handleView = (roleMapping: RoleMapping) => {
    setSelectedRoleMapping(roleMapping);
    setDialogType('view');
  };

  const handleCloseDialog = () => {
    setSelectedRoleMapping(null);
    setDialogType(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['role-mappings'] });
    handleCloseDialog();
  };

  const mappings = mappingsData?.mappings || [];


  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load role mappings</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Role Mappings
            </h1>
            <p className="text-text-secondary mt-1">
              Manage Auth0 to backend role mappings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['role-mappings'] })}
              className="btn-secondary flex items-center gap-2"
              disabled={isRefetchingRoleMappings}
            >
              <RefreshCw className={clsx('w-4 h-4', isRefetchingRoleMappings && 'animate-spin')} />
              {isRefetchingRoleMappings ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Role Mappings */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Role Mappings</h2>
          </div>

          {isLoadingRoleMappings ? (
            <TableSkeleton rows={5} columns={6} />
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No role mappings found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-6 py-3 text-left">Auth0 Role</th>
                    <th className="px-6 py-3 text-left">Backend Role</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping: RoleMapping) => (
                    <tr key={mapping.id} className={clsx(
                      'table-row',
                      !mapping.is_active && 'opacity-60 bg-gray-50 dark:bg-gray-900/50'
                    )}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-text-primary">
                          {mapping.auth0_role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getBackendRoleColor(mapping.backend_role)
                        )}>
                          {getBackendRoleLabel(mapping.backend_role)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-text-secondary text-sm">
                          {mapping.description || 'No description'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          mapping.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        )}>
                          {mapping.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(mapping)}
                            className="text-text-secondary hover:text-text-primary p-1"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(mapping)}
                            className="text-text-secondary hover:text-text-primary p-1"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dialogs */}
        {dialogType === 'view' && selectedRoleMapping && (
          <RoleMappingViewDialog
            roleMapping={selectedRoleMapping}
            isOpen={true}
            onClose={handleCloseDialog}
          />
        )}

        {dialogType === 'edit' && selectedRoleMapping && (
          <RoleMappingEditDialog
            roleMapping={selectedRoleMapping}
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
