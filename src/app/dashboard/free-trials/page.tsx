'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { platformAdminApi } from '@/lib/api';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Building2,
  RefreshCw,
  X,
  Plus,
  Pencil,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import Modal from '@/components/ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { OrganizationListItem } from '@/types/api';

type FreeTrialOrganization = Pick<
  OrganizationListItem,
  'id' | 'name' | 'tier' | 'user_count' | 'last_activity' | 'created_at' | 'free_tier_expires_at'
>;

export default function FreeTrialsPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    org: FreeTrialOrganization | null;
    expirationDate: string;
  }>({ isOpen: false, org: null, expirationDate: '' });
  const [expireConfirmModal, setExpireConfirmModal] = useState<{
    isOpen: boolean;
    org: FreeTrialOrganization | null;
  }>({ isOpen: false, org: null });

  const debouncedSearch = useDebounce(search, 500);

  // Fetch free trial organizations
  const { data: orgsData, isLoading: isLoadingOrgs, isRefetching: isRefetchingOrgs } = useQuery({
    queryKey: ['free-trial-organizations', currentPage, pageSize, debouncedSearch],
    queryFn: async () => {
      const params: { skip: number; limit: number; search?: string } = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      return platformAdminApi.getFreeTrialOrganizations(params);
    },
  });

  // Expire mutation
  const expireMutation = useMutation({
    mutationFn: (orgId: number) => platformAdminApi.expireFreeTrial(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-trial-organizations'] });
      toast.success('Free trial expired successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to expire free trial'));
    },
  });

  // Update expiration date mutation
  const updateExpirationMutation = useMutation({
    mutationFn: ({ orgId, expirationDate }: { orgId: number; expirationDate: string }) =>
      platformAdminApi.updateFreeTrialExpiration(orgId, expirationDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-trial-organizations'] });
      toast.success('Free trial expiration date updated successfully');
      setEditModal({ isOpen: false, org: null, expirationDate: '' });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update expiration date'));
    },
  });

  const organizations: FreeTrialOrganization[] =
    ((orgsData as any)?.data?.organizations || []).map((org: OrganizationListItem): FreeTrialOrganization => ({
      id: org.id,
      name: org.name,
      tier: org.tier,
      user_count: org.user_count,
      last_activity: org.last_activity,
      created_at: org.created_at,
      free_tier_expires_at: org.free_tier_expires_at,
    }));

  const metadata = (orgsData as any)?.metadata;

  // Calculate stats
  const stats = {
    total: metadata?.total || 0,
    expiringSoon: organizations.filter((org) => {
      if (!org.free_tier_expires_at) return false;
      const daysLeft = differenceInDays(new Date(org.free_tier_expires_at), new Date());
      return daysLeft > 0 && daysLeft <= 7;
    }).length,
    active: organizations.filter((org) => {
      if (!org.free_tier_expires_at) return false;
      const daysLeft = differenceInDays(new Date(org.free_tier_expires_at), new Date());
      return daysLeft > 7;
    }).length,
  };

  const handleExpire = (org: FreeTrialOrganization) => {
    setExpireConfirmModal({ isOpen: true, org });
  };

  const confirmExpire = () => {
    if (expireConfirmModal.org) {
      expireMutation.mutate(expireConfirmModal.org.id);
      setExpireConfirmModal({ isOpen: false, org: null });
    }
  };

  const handleEdit = (org: FreeTrialOrganization) => {
    // Pre-fill with current expiration date if available, formatted as YYYY-MM-DD
    const currentDate = org.free_tier_expires_at 
      ? format(new Date(org.free_tier_expires_at), 'yyyy-MM-dd')
      : '';
    setEditModal({ isOpen: true, org, expirationDate: currentDate });
  };

  const getDaysRemaining = (expiresAt: string | null | undefined): number | null => {
    if (!expiresAt) return null;
    return differenceInDays(new Date(expiresAt), new Date());
  };

  const getExpirationStatus = (expiresAt: string | null | undefined): 'expired' | 'expiring-soon' | 'active' => {
    if (!expiresAt) return 'active';
    const daysLeft = getDaysRemaining(expiresAt);
    if (daysLeft === null || daysLeft < 0) return 'expired';
    if (daysLeft <= 7) return 'expiring-soon';
    return 'active';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Free Trial Management"
          description="Manage organizations with active free trials"
          showRefresh={true}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['free-trial-organizations'] });
          }}
          isRefreshing={isRefetchingOrgs}
        />

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingOrgs}
          columns={3}
          stats={[
            {
              id: 'total',
              title: 'Total Free Trials',
              value: stats.total,
              icon: Building2,
              iconColor: 'text-brand-navy',
            },
            {
              id: 'active',
              title: 'Active Trials',
              value: stats.active,
              icon: Clock,
              iconColor: 'text-status-success',
            },
            {
              id: 'expiring-soon',
              title: 'Expiring Soon',
              value: stats.expiringSoon,
              icon: AlertTriangle,
              iconColor: 'text-status-warning',
            },
          ]}
        />

        {/* Search */}
        <div className="card">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field flex-1"
            />
          </div>
        </div>

        {/* Organizations Table */}
        <div className="card p-0 overflow-hidden">
          {isLoadingOrgs ? (
            <TableSkeleton rows={pageSize} columns={6} />
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No free trial organizations found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {search
                  ? 'No organizations match your search.'
                  : 'There are currently no organizations with active free trials.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-6 py-3 text-left">Organization</th>
                      <th className="px-6 py-3 text-left">Users</th>
                      <th className="px-6 py-3 text-left">Expiration Date</th>
                      <th className="px-6 py-3 text-left">Days Remaining</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6 dark:divide-gray-600">
                    {organizations.map((org) => {
                      const daysRemaining = getDaysRemaining(org.free_tier_expires_at);
                      const status = getExpirationStatus(org.free_tier_expires_at);
                      return (
                        <tr key={org.id} className="table-row">
                          <td className="px-6 py-4">
                            <div className="flex items-center min-w-0">
                              <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3 min-w-0 flex-1">
                                <p className="text-sm font-medium text-text-primary truncate">{org.name}</p>
                                <p className="text-sm text-text-secondary">ID: {org.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-text-primary">{org.user_count || 0}</span>
                          </td>
                          <td className="px-6 py-4">
                            {org.free_tier_expires_at ? (
                              <div className="text-sm">
                                <div className="font-medium text-text-primary">
                                  {format(new Date(org.free_tier_expires_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-text-secondary">
                                  {format(new Date(org.free_tier_expires_at), 'h:mm a')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-text-secondary">No expiration</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {daysRemaining !== null ? (
                              <span
                                className={`text-sm font-medium ${
                                  daysRemaining < 0
                                    ? 'text-status-error'
                                    : daysRemaining <= 7
                                    ? 'text-status-warning'
                                    : 'text-status-success'
                                }`}
                              >
                                {daysRemaining < 0
                                  ? `Expired ${Math.abs(daysRemaining)} days ago`
                                  : `${daysRemaining} days`}
                              </span>
                            ) : (
                              <span className="text-sm text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status === 'expired'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                  : status === 'expiring-soon'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              }`}
                            >
                              {status === 'expired'
                                ? 'Expired'
                                : status === 'expiring-soon'
                                ? 'Expiring Soon'
                                : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(org)}
                                className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                                disabled={updateExpirationMutation.isPending}
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleExpire(org)}
                                className="btn-secondary bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 flex items-center gap-1"
                                disabled={expireMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                                Expire
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {metadata && metadata.total_pages > 1 && (
                <div className="px-6 py-3 bg-bg-light-1 dark:bg-gray-800 border-t border-bg-light-6 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, metadata.total)} of {metadata.total}{' '}
                        results
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={!metadata.has_prev}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-sm"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-text-secondary">
                        Page {currentPage} of {metadata.total_pages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={!metadata.has_next}
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

        {/* Edit Expiration Date Modal */}
        <Modal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, org: null, expirationDate: '' })}
          size="md"
          title="Edit Free Trial Expiration"
        >
          <div className="p-6">
            {editModal.org && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-secondary mb-2">
                    Update expiration date for <strong>{editModal.org.name}</strong>
                  </p>
                  {editModal.org.free_tier_expires_at && (
                    <p className="text-xs text-text-secondary">
                      Current expiration: {format(new Date(editModal.org.free_tier_expires_at), 'PP')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Expiration Date <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={editModal.expirationDate}
                    onChange={(e) =>
                      setEditModal({ ...editModal, expirationDate: e.target.value })
                    }
                    className="input-field"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select the new expiration date for this free trial
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setEditModal({ isOpen: false, org: null, expirationDate: '' })}
                    className="btn-secondary"
                    disabled={updateExpirationMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editModal.org && editModal.expirationDate) {
                        updateExpirationMutation.mutate({ 
                          orgId: editModal.org.id, 
                          expirationDate: editModal.expirationDate 
                        });
                      }
                    }}
                    className="btn-primary"
                    disabled={updateExpirationMutation.isPending || !editModal.expirationDate}
                  >
                    {updateExpirationMutation.isPending ? 'Updating...' : 'Update Expiration'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Expire Confirmation Dialog */}
        <ConfirmationModal
          isOpen={expireConfirmModal.isOpen}
          onClose={() => setExpireConfirmModal({ isOpen: false, org: null })}
          onConfirm={confirmExpire}
          title="Expire Free Trial"
          description="Are you sure you want to expire this free trial? This will immediately remove the free tier access for this organization."
          itemName={expireConfirmModal.org?.name || ''}
          type="warning"
          confirmLabel="Expire Trial"
          isLoading={expireMutation.isPending}
          consequences={[
            'The organization will immediately lose free tier access',
            'Users will no longer be able to use free tier features',
            'The organization will need to subscribe to a paid plan to continue using the service'
          ]}
        />
      </div>
    </DashboardLayout>
  );
}

