'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api, platformAdminApi, systemApi, superAdminApi } from '@/lib/api';
import {
  Organization,
  OrganizationListItem,
  Tier,
  PaginatedResponse,
  OrganizationListResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest
} from '@/types/api';
import { TIER_OPTIONS, ORGANIZATION_STATUS_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS } from '@/constants/status';
import {
  Building2,
  Ban,
  CheckCircle,
  Users,
  AlertTriangle,
  Crown,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { SoftDeletionDialog, PermanentDeletionDialog, RestoreDialog } from '@/components/ui/DeletionDialog';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import TierAssignmentModal from '@/components/ui/TierAssignmentModal';
import OrganizationModal, { OrganizationFormPayload } from '@/components/ui/OrganizationModal';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import SearchFilters, { FilterField } from '@/components/common/SearchFilters';
import StatusBadge from '@/components/common/StatusBadge';

interface OrganizationFilters {
  search: string;
  tier: string;
  status: string;
  subscription_status: string;
}

interface ExtendedOrganization extends Organization {
  user_count?: number;
  last_activity?: string;
  billing_status?: string;
  is_active?: boolean;
  suspended_at?: string | null;
  suspended_by?: number | null;
  reactivated_at?: string | null;
  reactivated_by?: number | null;
  service_type: string;
  is_standalone?: boolean | null;
  billing_location?: 'WORLD' | 'BRAZIL' | null;
  credential_login_enabled?: boolean;
  credential_registration_enabled?: boolean;
}

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<OrganizationFilters>({
    search: '',
    tier: '',
    status: '',
    subscription_status: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showTierModal, setShowTierModal] = useState<number | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExtendedOrganization | null>(null);
  const [pendingDetailNavigation, setPendingDetailNavigation] = useState<number | null>(null);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Dialog states
  const [deletionDialog, setDeletionDialog] = useState<{
    isOpen: boolean;
    type: 'soft' | 'permanent';
    organization: Organization | null;
  }>({ isOpen: false, type: 'soft', organization: null });

  const [restoreDialog, setRestoreDialog] = useState<{
    isOpen: boolean;
    organization: Organization | null;
  }>({ isOpen: false, organization: null });

  // Fetch organizations with pagination and filters (using debounced search)
  const { data: orgsData, isLoading: isLoadingOrgs, error, isRefetching: isRefetchingOrgs } = useQuery({
    queryKey: ['organizations', currentPage, pageSize, debouncedSearch, filters.tier, filters.status, filters.subscription_status, showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.status) params.append('status', filters.status);
      if (filters.subscription_status) params.append('subscription_status', filters.subscription_status);
      if (showDeleted) params.append('include_deleted', 'true');

      return api.getRaw<PaginatedResponse<OrganizationListResponse>>(`/api/pa/orgs?${params}`);
    },
  });

  // Separate query for stats (less frequent updates)
  const { data: statsData, isLoading: isLoadingStats, isRefetching: isRefetchingOrgStats } = useQuery({
    queryKey: ['organization-stats', showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showDeleted) params.append('include_deleted', 'true');
      return api.getRaw<PaginatedResponse<OrganizationListResponse>>(`/api/pa/orgs?${params}`);
    },
    staleTime: 30000, // Stats don't need to be as fresh, cache for 30 seconds
  });

  // Fetch available tiers
  const { data: tiersData } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => systemApi.getTiers(),
  });

  const tiers = (tiersData as { tiers: Tier[] })?.tiers || [];

  // Organization actions mutations
  const suspendOrgMutation = useMutation({
    mutationFn: (orgId: number) =>
      platformAdminApi.suspendOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization suspended successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to suspend organization'));
    },
  });

  const reactivateOrgMutation = useMutation({
    mutationFn: (orgId: number) =>
      platformAdminApi.reactivateOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization reactivated successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to reactivate organization'));
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ orgId, tier }: { orgId: number; tier: string }) =>
      platformAdminApi.setOrganizationTier(orgId, { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization tier updated successfully');
      setShowTierModal(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update organization tier'));
    },
  });

  const removeTierMutation = useMutation({
    mutationFn: (orgId: number) =>
      platformAdminApi.removeOrganizationTier(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization tier removed successfully');
      setShowTierModal(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to remove organization tier'));
    },
  });

  const softDeleteOrgMutation = useMutation({
    mutationFn: (orgId: number) =>
      platformAdminApi.softDeleteOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization soft deleted successfully');
      setDeletionDialog({ isOpen: false, type: 'soft', organization: null });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete organization'));
    },
  });

  const permanentDeleteOrgMutation = useMutation({
    mutationFn: (orgId: number) =>
      superAdminApi.permanentDelete({ entity_type: 'organization', entity_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization permanently deleted');
      setDeletionDialog({ isOpen: false, type: 'permanent', organization: null });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to permanently delete organization'));
    },
  });

  const restoreOrgMutation = useMutation({
    mutationFn: (orgId: number) =>
      platformAdminApi.restoreSoftDeleted({ entity_type: 'organization', entity_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization restored successfully');
      setRestoreDialog({ isOpen: false, organization: null });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to restore organization'));
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: (data: CreateOrganizationRequest) => platformAdminApi.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization created successfully');
      setShowOrgModal(false);
      setEditingOrg(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create organization'));
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ orgId, data }: { orgId: number; data: UpdateOrganizationRequest }) =>
      platformAdminApi.updateOrganization(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
      toast.success('Organization updated successfully');
      setShowOrgModal(false);
      setEditingOrg(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update organization'));
    },
  });

  // Handle detail navigation with immediate feedback
  const handleDetailNavigation = (orgId: number) => {
    setPendingDetailNavigation(orgId);
    // Add a small delay to show the feedback, then navigate
    setTimeout(() => {
      router.push(`/dashboard/organizations/${orgId}`);
    }, 150);
  };

  // Clear pending state on navigation
  useEffect(() => {
    const clearPending = () => setPendingDetailNavigation(null);
    // Set a timeout to clear the pending state
    const timeout = setTimeout(clearPending, 1000);
    return () => clearTimeout(timeout);
  }, [pendingDetailNavigation]);

  const handleFilterChange = (key: keyof OrganizationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCreateOrganization = () => {
    setEditingOrg(null);
    setShowOrgModal(true);
  };

  const handleEditOrganization = (org: ExtendedOrganization) => {
    setEditingOrg(org);
    setShowOrgModal(true);
  };

  const handleOrgModalSubmit = (data: OrganizationFormPayload) => {
    if (editingOrg) {
      if (!data.service_type) {
        toast.error('Service type is required');
        return;
      }
      const updateData: UpdateOrganizationRequest = {
        name: data.name,
        tier_id: data.tier_id,
        service_type: data.service_type,
        billing_location: data.billing_location,
        credential_login_enabled: data.credential_login_enabled,
        credential_registration_enabled: data.credential_registration_enabled,
      };
      updateOrgMutation.mutate({
        orgId: editingOrg.id,
        data: updateData,
      });
    } else {
      if (!data.name) {
        toast.error('Organization name is required');
        return;
      }
      if (!data.service_type) {
        toast.error('Service type is required');
        return;
      }
      const createData: CreateOrganizationRequest = {
        name: data.name,
        tier_id: data.tier_id,
        service_type: data.service_type,
        billing_location: data.billing_location || 'WORLD',
        credential_login_enabled: data.credential_login_enabled,
        credential_registration_enabled: data.credential_registration_enabled,
      };
      createOrgMutation.mutate(createData);
    }
  };

  const handleOrgModalClose = () => {
    setShowOrgModal(false);
    setEditingOrg(null);
  };

  const mapOrg = (org: OrganizationListItem): ExtendedOrganization => ({
    id: org.id,
    name: org.name,
    tier_id: org.tier_id ?? null,
    tier: org.tier_id != null
      ? { id: org.tier_id, name: org.tier ?? '', slug: org.tier ?? '', created_at: '', updated_at: '' }
      : null,
    subscription_status: org.subscription_status ?? undefined,
    service_type: org.service_type ?? undefined,
    created_at: org.created_at ?? undefined,
    deleted_at: org.deleted_at ?? undefined,
    is_active: org.is_active ?? undefined,
    user_count: org.user_count ?? undefined,
    last_activity: org.last_activity ?? undefined,
    billing_status: org.subscription_status ?? undefined,
    is_standalone: org.is_standalone ?? undefined,
    billing_location: org.billing_location ?? undefined,
    credential_login_enabled: org.credential_login_enabled ?? false,
    credential_registration_enabled: org.credential_registration_enabled ?? false,
  } as ExtendedOrganization);

  // Extended data with backend-supported fields
  const organizations: ExtendedOrganization[] = (orgsData?.data?.data?.organizations || []).map(mapOrg);

  // Stats data from separate query
  const allOrganizations: ExtendedOrganization[] = (statsData?.data?.data?.organizations || []).map(mapOrg);

  const metadata = orgsData?.data?.metadata;
  const statsMetadata = statsData?.data?.metadata;

  // Detect if search is being typed (not yet debounced)
  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;

  // Filter configuration for SearchFilters component
  const filterFields: FilterField[] = [
    {
      id: 'tier',
      label: 'Tier',
      value: filters.tier,
      onChange: (value) => handleFilterChange('tier', value),
      options: [...TIER_OPTIONS]
    },
    {
      id: 'status',
      label: 'Status',
      value: filters.status,
      onChange: (value) => handleFilterChange('status', value),
      options: [...ORGANIZATION_STATUS_OPTIONS]
    },
    {
      id: 'subscription_status',
      label: 'Subscription',
      value: filters.subscription_status,
      onChange: (value) => handleFilterChange('subscription_status', value),
      options: [...SUBSCRIPTION_STATUS_OPTIONS]
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Organization Management"
          description="Manage organizations, tiers, subscriptions, and settings across the platform"
          actions={[
            {
              id: 'create-org',
              label: 'Create Organization',
              icon: Building2,
              onClick: handleCreateOrganization,
              variant: 'primary'
            }
          ]}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
          }}
          isRefreshing={isRefetchingOrgs || isRefetchingOrgStats}
        />

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingStats}
          columns={4}
          stats={[
            {
              id: 'total',
              title: 'Total Organizations',
              value: statsMetadata?.total || 0,
              icon: Building2,
              iconColor: 'text-brand-navy'
            },
            {
              id: 'active',
              title: 'Active Organizations',
              value: allOrganizations.filter(o => !o.deleted_at && o.billing_status === 'active').length,
              icon: CheckCircle,
              iconColor: 'text-status-success'
            },
            {
              id: 'deleted',
              title: 'Deleted Organizations',
              value: allOrganizations.filter(o => o.deleted_at).length,
              icon: AlertTriangle,
              iconColor: 'text-status-error'
            },
            {
              id: 'enterprise',
              title: 'Enterprise Tier',
              value: allOrganizations.filter(o => !o.deleted_at && o.tier?.slug === 'enterprise').length,
              icon: Crown,
              iconColor: 'text-status-info'
            }
          ]}
        />
        {/* Filters and Search */}
        <SearchFilters
          searchValue={filters.search}
          onSearchChange={(value) => handleFilterChange('search', value)}
          searchPlaceholder="Search organizations by name..."
          isSearching={isSearching}
          filters={filterFields}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          showDeleted={showDeleted}
          onToggleDeleted={() => setShowDeleted(!showDeleted)}
          deletedLabel="Show Deleted"
          onClearFilters={() => setFilters({ search: '', tier: '', status: '', subscription_status: '' })}
        />

        {/* Organizations Table */}
        <div className="card p-0 overflow-hidden">
          {isLoadingOrgs ? (
            <TableSkeleton rows={pageSize} columns={9} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-6 py-3 text-left">Organization</th>
                    <th className="px-6 py-3 text-left">Tier (BL)</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Service Type</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Credential Auth</th>
                    <th className="px-6 py-3 text-left">Users</th>
                    <th className="px-6 py-3 text-left">Last Activity</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6 dark:divide-gray-600">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            No organizations found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {showDeleted
                              ? "No deleted organizations to display."
                              : (filters.search || filters.tier || filters.status || filters.subscription_status)
                                ? "No organizations match your current filters."
                                : "No organizations have been created yet."
                            }
                          </p>
                        </div>
                        {!showDeleted && (filters.search || filters.tier || filters.status || filters.subscription_status) && (
                          <button
                            onClick={() => setFilters({ search: '', tier: '', status: '', subscription_status: '' })}
                            className="text-sm text-brand-navy hover:text-brand-navy-dark font-medium"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                  <tr key={org.id} className={clsx(
                    'table-row',
                    org.deleted_at && 'opacity-60 bg-gray-50 dark:bg-gray-900/50'
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center text-white font-medium text-sm">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <p className={clsx(
                              "text-sm font-medium",
                              org.deleted_at ? "text-gray-500 dark:text-gray-400 line-through" : "text-text-primary"
                            )}>
                              {org.name}
                            </p>
                            {org.deleted_at && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                                Deleted
                              </span>
                            )}
                          </div>
                          <p className={clsx(
                            "text-sm",
                            org.deleted_at ? "text-gray-400 dark:text-gray-500" : "text-text-secondary"
                          )}>ID: {org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {org.tier ? (
                          <StatusBadge
                            status={org.tier.name}
                            variant={org.tier.slug === 'enterprise' ? 'featured' : 'info'}
                            showIcon={true}
                          />
                        ) : (
                          <StatusBadge status="no tier" variant="neutral" />
                        )}
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit',
                            org.billing_location === 'BRAZIL'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          )}
                          title="Billing location"
                        >
                          <DollarSign className="w-3 h-3" />
                          {org.billing_location === 'BRAZIL' ? 'Brazil' : 'World'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {org.is_standalone ? (
                        <StatusBadge
                          status="Standalone"
                          variant="info"
                          showIcon={false}
                        />
                      ) : (
                        <StatusBadge
                          status="Multi-user"
                          variant="neutral"
                          showIcon={false}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={org.service_type}
                        variant={org.service_type === 'PLATFORM' ? 'info' : 'featured'}
                        showIcon={false}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          !org.is_active ? 'suspended' :
                          org.subscription_status === 'canceled' ? 'canceled' :
                          org.subscription_status === 'past_due' ? 'past due' :
                          org.subscription_status === 'trialing' ? 'trial' :
                          'active'
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                            org.credential_login_enabled
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          )}
                          title="Credential login"
                        >
                          Login: {org.credential_login_enabled ? 'On' : 'Off'}
                        </span>
                        <span
                          className={clsx(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                            org.credential_registration_enabled
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          )}
                          title="Credential registration"
                        >
                          Register: {org.credential_registration_enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">{org.user_count || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {org.last_activity ? format(new Date(org.last_activity), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDetailNavigation(org.id)}
                          disabled={pendingDetailNavigation === org.id}
                          className="p-1 text-text-secondary hover:text-brand-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="View details"
                        >
                          {pendingDetailNavigation === org.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEditOrganization(org)}
                          className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                          title="Edit organization"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setShowTierModal(org.id)}
                          className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                          title="Change tier"
                        >
                          <Crown className="w-4 h-4" />
                        </button>

                        {org.deleted_at ? (
                          <>
                            <button
                              onClick={() => setRestoreDialog({ isOpen: true, organization: org })}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              title="Restore organization"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletionDialog({ isOpen: true, type: 'permanent', organization: org })}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors"
                              title="Permanently delete"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {org.is_active ? (
                              <button
                                onClick={() => suspendOrgMutation.mutate(org.id)}
                                disabled={suspendOrgMutation.isPending}
                                className="p-1 text-status-warning hover:text-status-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Suspend organization"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => reactivateOrgMutation.mutate(org.id)}
                                disabled={reactivateOrgMutation.isPending}
                                className="p-1 text-status-success hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reactivate organization"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletionDialog({ isOpen: true, type: 'soft', organization: org })}
                              className="p-1 text-text-secondary hover:text-status-error transition-colors"
                              title="Delete organization"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {!isLoadingOrgs && metadata && (
            <div className="px-6 py-3 bg-bg-light-1 dark:bg-gray-800 border-t border-bg-light-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, metadata.total)} of {metadata.total} results
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!metadata.has_prev}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-text-secondary">
                    Page {currentPage} of {metadata.total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!metadata.has_next}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tier Assignment Modal */}
        <TierAssignmentModal
          isOpen={!!showTierModal}
          onClose={() => setShowTierModal(null)}
          organization={showTierModal ? organizations.find(org => org.id === showTierModal) || null : null}
          tiers={tiers}
          onTierChange={(orgId, tierSlug) => {
            console.log('Updating tier:', { orgId, tier: tierSlug });
            updateTierMutation.mutate({
              orgId,
              tier: tierSlug
            });
          }}
          onTierRemove={(orgId) => {
            removeTierMutation.mutate(orgId);
          }}
          isLoading={updateTierMutation.isPending || removeTierMutation.isPending}
        />

        {/* Organization Create/Edit Modal */}
        <OrganizationModal
          isOpen={showOrgModal}
          onClose={handleOrgModalClose}
          organization={editingOrg as Organization | null}
          onSubmit={handleOrgModalSubmit}
          isLoading={createOrgMutation.isPending || updateOrgMutation.isPending}
        />

        {/* Deletion Dialogs */}
        <SoftDeletionDialog
          isOpen={deletionDialog.isOpen && deletionDialog.type === 'soft'}
          onClose={() => setDeletionDialog({ isOpen: false, type: 'soft', organization: null })}
          onConfirm={() => {
            if (deletionDialog.organization) {
              softDeleteOrgMutation.mutate(deletionDialog.organization.id);
            }
          }}
          title="Delete Organization"
          description="Are you sure you want to delete this organization? This action will hide the organization but can be undone later."
          itemName={deletionDialog.organization ? deletionDialog.organization.name : ''}
          isLoading={softDeleteOrgMutation.isPending}
          consequences={[
            'Organization will be hidden from normal views',
            'Users won\'t be able to access the organization',
            'All organization data will be preserved',
            'Billing will be suspended',
            'Action can be reversed by restoring the organization'
          ]}
        />

        <PermanentDeletionDialog
          isOpen={deletionDialog.isOpen && deletionDialog.type === 'permanent'}
          onClose={() => setDeletionDialog({ isOpen: false, type: 'permanent', organization: null })}
          onConfirm={() => {
            if (deletionDialog.organization) {
              permanentDeleteOrgMutation.mutate(deletionDialog.organization.id);
            }
          }}
          title="Permanently Delete Organization"
          description="This will permanently delete the organization and all associated data. This action cannot be undone."
          itemName={deletionDialog.organization ? deletionDialog.organization.name : ''}
          isLoading={permanentDeleteOrgMutation.isPending}
          consequences={[
            'Organization will be completely removed',
            'All users in this organization will be deleted',
            'All organization data will be permanently lost',
            'All reports and files will be deleted',
            'Billing history will be removed',
            'This action cannot be reversed'
          ]}
          requiresConfirmation={true}
        />

        <RestoreDialog
          isOpen={restoreDialog.isOpen}
          onClose={() => setRestoreDialog({ isOpen: false, organization: null })}
          onConfirm={() => {
            if (restoreDialog.organization) {
              restoreOrgMutation.mutate(restoreDialog.organization.id);
            }
          }}
          title="Restore Organization"
          description="Are you sure you want to restore this organization? This will make the organization active and accessible again."
          itemName={restoreDialog.organization ? restoreDialog.organization.name : ''}
          isLoading={restoreOrgMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
