'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, superAdminApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Ticket,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getActivationCodeStatusBadge } from '@/constants/badges';
import { getErrorMessage } from '@/utils/error';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import ActivationCodeModal from '@/components/ui/ActivationCodeModal';
import PageHeader from '@/components/common/PageHeader';
import { ActivationCodesApiResponse, ActivationCode } from '@/types/api';

export default function ActivationCodesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [codeModal, setCodeModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit' | 'delete';
    code: ActivationCode | null;
  }>({ isOpen: false, type: 'create', code: null });
  const queryClient = useQueryClient();

  // Fetch activation codes
  const { data: codesData, isLoading: isLoadingCodes, isRefetching: isRefetchingCodes } = useQuery({
    queryKey: ['activation-codes', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      return api.getRaw(`/api/sa/activation-codes/list?${params}`);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      description: string | null;
      is_active: boolean;
      tier_id: number;
      organization_id: number;
      recipient_mode?: 'existing_user' | 'open_registration';
      recipient_user_id?: number;
      registration_role?: string;
      confirm_org_has_tier?: boolean;
      expires_at?: string | null;
    }) => superAdminApi.createActivationCode(data),
    onSuccess: () => {
      toast.success('Activation code created successfully!');
      queryClient.invalidateQueries({ queryKey: ['activation-codes'] });
      handleCloseCodeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create code'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => superAdminApi.updateActivationCode(id, data),
    onSuccess: () => {
      toast.success('Activation code updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['activation-codes'] });
      handleCloseCodeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update code'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (codeId: number) => superAdminApi.deleteActivationCode(codeId),
    onSuccess: () => {
      toast.success('Activation code deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['activation-codes'] });
      handleCloseCodeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete code'));
    },
  });

  // Copy code to clipboard
  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  // Action handlers
  const handleEdit = (code: ActivationCode) => {
    setCodeModal({ isOpen: true, type: 'edit', code });
  };

  const handleDelete = (code: ActivationCode) => {
    setCodeModal({ isOpen: true, type: 'delete', code });
  };

  const handleCreate = () => {
    setCodeModal({ isOpen: true, type: 'create', code: null });
  };

  // Modal handlers
  const handleCodeSave = (data: any) => {
    if (codeModal.type === 'create') {
      createMutation.mutate(data);
    } else if (codeModal.type === 'edit' && codeModal.code) {
      updateMutation.mutate({ id: codeModal.code.id, data });
    } else if (codeModal.type === 'delete' && codeModal.code) {
      deleteMutation.mutate(codeModal.code.id);
    }
  };

  const handleCloseCodeModal = () => {
    setCodeModal({ isOpen: false, type: 'create', code: null });
  };

  // Extract data from API response
  const codes = (codesData as ActivationCodesApiResponse)?.data?.data?.codes || [];
  const metadata = (codesData as ActivationCodesApiResponse)?.data?.data || { total: 0, page: 1, per_page: 10, total_pages: 1 };

  // Calculate stats from data
  const stats = codes.length > 0 ? {
    total: metadata.total,
    active: codes.filter((code: ActivationCode) => code.is_usable).length,
    used: codes.filter((code: ActivationCode) => code.is_used).length,
    inactive: codes.filter((code: ActivationCode) => !code.is_active).length
  } : { total: 0, active: 0, used: 0, inactive: 0 };



  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Activation Codes"
          description="Manage free trial activation codes"
          actions={[
            {
              id: 'create-code',
              label: 'Create Code',
              icon: Plus,
              onClick: handleCreate,
              variant: 'primary',
            },
          ]}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['activation-codes'] });
          }}
          isRefreshing={isRefetchingCodes}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Codes</p>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              </div>
              <Ticket className="w-8 h-8 text-brand-navy" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Active Codes</p>
                <p className="text-2xl font-bold text-text-primary">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-status-success" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Used Codes</p>
                <p className="text-2xl font-bold text-text-primary">{stats.used}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Inactive Codes</p>
                <p className="text-2xl font-bold text-text-primary">{stats.inactive}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Activation Codes Table and Filters */}
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-text-primary lg:mr-auto">Activation Codes</h2>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field w-40"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </div>
          </div>

          {isLoadingCodes ? (
            <TableSkeleton rows={10} columns={6} />
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {statusFilter !== 'all'
                ? 'No activation codes found matching your filter.'
                : 'No activation codes found. Create your first code to get started.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-6 py-3 text-left">Code</th>
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-left">Organization</th>
                      <th className="px-6 py-3 text-left">Trial tier</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Expiration</th>
                      <th className="px-6 py-3 text-left">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code: ActivationCode) => (
                      <tr key={code.id} className="table-row">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <code className="text-sm font-mono bg-bg-light-2 dark:bg-gray-700 px-2 py-1 rounded text-text-primary dark:text-gray-100">
                              {code.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(code.code)}
                              className="ml-2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                              title="Copy code"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-text-primary">
                            {code.description || (
                              <span className="text-text-secondary italic">No description</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-text-primary">{code.organization_name}</div>
                            <div className="text-text-secondary text-xs">
                              {code.organization_tier_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {code.tier ? (
                            <span className="text-sm font-medium text-text-primary">{code.tier.name}</span>
                          ) : (
                            <span className="text-sm text-text-secondary italic">No tier</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getActivationCodeStatusBadge(code)}
                        </td>
                        <td className="px-6 py-4">
                          {code.expires_at ? (
                            <div className="text-sm">
                              <div className="font-medium text-text-primary">
                                {new Date(code.expires_at).toLocaleDateString()}
                              </div>
                              {new Date(code.expires_at) < new Date() && (
                                <div className="text-xs text-status-error mt-1 font-medium">
                                  Expired
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-text-secondary italic">No expiration</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-text-primary">
                              {new Date(code.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-text-secondary">
                              {new Date(code.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!code.is_used && (
                              <button
                                onClick={() => handleEdit(code)}
                                className="text-text-secondary hover:text-text-primary p-1"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(code)}
                              className="text-text-secondary hover:text-status-error p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {metadata && metadata.total_pages > 1 && (
                <div className="mt-6 px-6 py-3 bg-bg-light-1 dark:bg-gray-800 border-t border-bg-light-6 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">
                        Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, metadata.total)} of {metadata.total} results
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-sm"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-text-secondary">
                        Page {page} of {metadata.total_pages}
                      </span>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= metadata.total_pages}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <ActivationCodeModal
          isOpen={codeModal.isOpen}
          onClose={handleCloseCodeModal}
          code={codeModal.code}
          type={codeModal.type}
          onSave={handleCodeSave}
          isLoading={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        />

      </div>
    </DashboardLayout>
  );
}
