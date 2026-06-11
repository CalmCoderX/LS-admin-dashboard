'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api, platformAdminApi, superAdminApi } from '@/lib/api';
import {
  User,
  Organization,
  UserRole,
  PaginatedResponse,
  UserListResponse,
  UserStatsResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/types/api';
import { USER_ROLES_WITH_ALL } from '@/constants/roles';
import { USER_STATUS_OPTIONS } from '@/constants/status';
import {
  UserPlus,
  Shield,
  CheckCircle,
  Ban,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import {
  SoftDeletionDialog,
  PermanentDeletionDialog,
  RestoreDialog,
  SuspendConfirmationDialog,
} from '@/components/ui/DeletionDialog';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import UserModal from '@/components/ui/UserModal';
import UserTable from '@/components/ui/UserTable';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import SearchFilters, { FilterField } from '@/components/common/SearchFilters';

interface UserFilters {
  search: string;
  role: string;
  status: string;
  org_name: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    org_name: '',
  });

  // Initialize filters from URL parameters
  useEffect(() => {
    const orgNameParam = searchParams.get('org_name');
    const searchParam = searchParams.get('search');
    const roleParam = searchParams.get('role');
    const statusParam = searchParams.get('status');

    if (orgNameParam || searchParam || roleParam || statusParam) {
      setFilters({
        search: searchParam || '',
        role: roleParam || '',
        status: statusParam || '',
        org_name: orgNameParam || '',
      });
      // Show filters section if there are URL parameters
      setShowFilters(true);
    }
  }, [searchParams]);

  const [showFilters, setShowFilters] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);
  const debouncedOrgName = useDebounce(filters.org_name, 500);

  // Dialog states
  const [deletionDialog, setDeletionDialog] = useState<{
    isOpen: boolean;
    type: 'soft' | 'permanent';
    user: User | null;
  }>({ isOpen: false, type: 'soft', user: null });

  const [restoreDialog, setRestoreDialog] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });

  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });

  const [suspendDialog, setSuspendDialog] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });

  // Fetch users with pagination and filters (using debounced search and org name)
  const { data: usersData, isLoading: isLoadingUsers, error, isRefetching: isRefetchingUsers } = useQuery({
    queryKey: ['users', currentPage, pageSize, debouncedSearch, filters.role, filters.status, debouncedOrgName, showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (debouncedOrgName) params.append('org_name', debouncedOrgName);
      if (showDeleted) params.append('include_deleted', 'true');

      return api.getRaw<PaginatedResponse<UserListResponse>>(`/api/oa/users?${params}`);
    },
  });

  // Fetch user statistics efficiently
  const { data: statsData, isLoading: isLoadingStats, isRefetching: isRefetchingUserStats } = useQuery({
    queryKey: ['user-stats', showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showDeleted) params.append('include_deleted', 'true');
      return api.getRaw(`/api/oa/users/stats?${params}`);
    },
    staleTime: 30000, // Stats don't need to be as fresh, cache for 30 seconds
  });

  // Fetch organizations for the user modal
  const { data: organizationsData, isLoading: isLoadingOrganizations, error: organizationsError } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => platformAdminApi.getOrganizations(),
    staleTime: 300000, // Organizations don't change often, cache for 5 minutes
    retry: 2,
  });

  // Show error if organizations fail to load
  useEffect(() => {
    if (organizationsError) {
      console.error('Failed to load organizations:', organizationsError);
      toast.error(getErrorMessage(organizationsError, 'Failed to load organizations for user modal'));
    }
  }, [organizationsError]);

  // User actions mutations
  const suspendUserMutation = useMutation({
    mutationFn: (userId: number) =>
      platformAdminApi.suspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User suspended successfully');
      setSuspendDialog({ isOpen: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to suspend user'));
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: (userId: number) =>
      platformAdminApi.reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User reactivated successfully');
    },
    onError: (error: Error) => {
      console.log({ error })
      toast.error(getErrorMessage(error, 'Failed to reactivate user'));
    },
  });

  const softDeleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      platformAdminApi.softDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User soft deleted successfully');
      setDeletionDialog({ isOpen: false, type: 'soft', user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to delete user'));
    },
  });

  const permanentDeleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      superAdminApi.permanentDelete({ entity_type: 'user', entity_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User permanently deleted');
      setDeletionDialog({ isOpen: false, type: 'permanent', user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to permanently delete user'));
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: (userId: number) =>
      platformAdminApi.restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User restored successfully');
      setRestoreDialog({ isOpen: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to restore user'));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) =>
      platformAdminApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User invited successfully. An invitation email has been sent.');
      setUserModal({ isOpen: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to invite user'));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: UpdateUserRequest }) =>
      platformAdminApi.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('User updated successfully');
      setUserModal({ isOpen: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to update user'));
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: (userId: number) => platformAdminApi.sendPasswordReset(userId),
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to send password reset email'));
    },
  });

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };



  const handleCreateUser = () => {
    setUserModal({ isOpen: true, user: null });
  };

  const handleEditUser = (user: User) => {
    setUserModal({ isOpen: true, user });
  };

  const handleUserSave = (formData: { 
    name: string; 
    email: string; 
    phone_number?: string;
    preferred_language?: string;
    role: string; 
    org_id?: number;
  }) => {
    if (userModal.user) {
      // Update existing user - only send updatable fields
      // Include org_id from formData if provided, otherwise use the current user's organization ID
      const updateData: UpdateUserRequest = {
        name: formData.name,
        phone_number: formData.phone_number,
        preferred_language: formData.preferred_language,
        role: formData.role,
        org_id: formData.org_id ?? userModal.user.organization?.id,
      };
      updateUserMutation.mutate({
        userId: userModal.user.id,
        userData: updateData
      });
    } else {
      // Create new user
      const createData: CreateUserRequest = {
        email: formData.email,
        name: formData.name,
        phone_number: formData.phone_number,
        preferred_language: formData.preferred_language,
        role: formData.role,
        org_id: formData.org_id,
      };
      createUserMutation.mutate(createData);
    }
  };


  const users = usersData?.data.data.users || [];
  const metadata = usersData?.data.metadata;

  // Stats data from dedicated stats endpoint
  const userStats: UserStatsResponse = (statsData?.data && typeof statsData.data === 'object' && 'total' in statsData.data)
    ? statsData.data as UserStatsResponse
    : {
      total: 0,
      active: 0,
      inactive: 0,
      deleted: 0,
      admins: 0
    };

  // Detect if search is being typed (not yet debounced)
  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;
  const isOrgNameSearching = filters.org_name !== debouncedOrgName && filters.org_name.length > 0;

  // Filter configuration for SearchFilters component
  const filterFields: FilterField[] = [
    {
      id: 'role',
      label: 'Role',
      value: filters.role,
      onChange: (value) => handleFilterChange('role', value),
      options: [...USER_ROLES_WITH_ALL]
    },
    {
      id: 'status',
      label: 'Status',
      value: filters.status,
      onChange: (value) => handleFilterChange('status', value),
      options: [...USER_STATUS_OPTIONS]
    },
    {
      id: 'org_name',
      label: 'Organization',
      value: filters.org_name,
      onChange: (value) => handleFilterChange('org_name', value),
      type: 'input',
      placeholder: 'Search by organization name...',
      options: []
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="User Management"
          description="Manage users, roles, and permissions across the platform"
            actions={[
            {
              id: 'invite-user',
              label: 'Invite User',
              icon: UserPlus,
              onClick: handleCreateUser,
              variant: 'primary'
            }
          ]}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            queryClient.invalidateQueries({ queryKey: ['organization-users'] });
          }}
          isRefreshing={isRefetchingUsers || isRefetchingUserStats}
        />

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingStats}
          columns={5}
          stats={[
            {
              id: 'total',
              title: 'Total Users',
              value: userStats.total,
              icon: Shield,
              iconColor: 'text-brand-navy'
            },
            {
              id: 'active',
              title: 'Active Users',
              value: userStats.active,
              icon: CheckCircle,
              iconColor: 'text-status-success'
            },
            {
              id: 'inactive',
              title: 'Suspended Users',
              value: userStats.inactive,
              icon: Ban,
              iconColor: 'text-status-warning'
            },
            {
              id: 'deleted',
              title: 'Deleted Users',
              value: userStats.deleted,
              icon: Trash2,
              iconColor: 'text-status-error'
            },
            {
              id: 'admins',
              title: 'Admins',
              value: userStats.admins,
              icon: Shield,
              iconColor: 'text-status-info'
            }
          ]}
        />

        {/* Filters and Search */}
        <SearchFilters
          searchValue={filters.search}
          onSearchChange={(value) => handleFilterChange('search', value)}
          searchPlaceholder="Search users by name or email..."
          isSearching={isSearching || isOrgNameSearching}
          filters={filterFields}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          showDeleted={showDeleted}
          onToggleDeleted={() => setShowDeleted(!showDeleted)}
          deletedLabel="Show Deleted"
          onClearFilters={() => setFilters({ search: '', role: '', status: '', org_name: '' })}
        />

        {/* Users Table */}
        <div className="card p-0 overflow-hidden">
          <UserTable
            users={users}
            isLoading={isLoadingUsers}
            showOrganization={true}
            showActions={true}
            showLastAction={true}
            onEdit={handleEditUser}
            onSuspend={(userId) => {
              const target = users.find((u) => u.id === userId) ?? null;
              setSuspendDialog({ isOpen: true, user: target });
            }}
            onReactivate={(userId) => reactivateUserMutation.mutate(userId)}
            onDelete={(user) => {
              if (user.deleted_at) {
                setDeletionDialog({ isOpen: true, type: 'permanent', user });
              } else {
                setDeletionDialog({ isOpen: true, type: 'soft', user });
              }
            }}
            onRestore={(user) => setRestoreDialog({ isOpen: true, user })}
            onPasswordReset={(userId) => sendPasswordResetMutation.mutate(userId)}
            isSuspending={suspendUserMutation.isPending}
            isReactivating={reactivateUserMutation.isPending}
            isDeleting={softDeleteUserMutation.isPending || permanentDeleteUserMutation.isPending}
            isRestoring={restoreUserMutation.isPending}
            isSendingReset={sendPasswordResetMutation.isPending}
            emptyMessage="No users found"
            emptyDescription={
              showDeleted
                ? "No deleted users to display."
                : filters.search || filters.role || filters.status || filters.org_name
                  ? "No users match your current filters."
                  : "No users have been registered yet."
            }
          />

          {/* Pagination */}
          {!isLoadingUsers && metadata && (
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

        {/* Deletion Dialogs */}
        <SoftDeletionDialog
          isOpen={deletionDialog.isOpen && deletionDialog.type === 'soft'}
          onClose={() => setDeletionDialog({ isOpen: false, type: 'soft', user: null })}
          onConfirm={() => {
            if (deletionDialog.user) {
              softDeleteUserMutation.mutate(deletionDialog.user.id);
            }
          }}
          title="Delete User"
          description="Are you sure you want to delete this user? This action will hide the user but can be undone later."
          itemName={deletionDialog.user ? `${deletionDialog.user.name} (${deletionDialog.user.email})` : ''}
          isLoading={softDeleteUserMutation.isPending}
          consequences={[
            'User will be hidden from normal views',
            'User will not be able to log in',
            'User data will be preserved',
            'Action can be reversed by restoring the user'
          ]}
        />

        <PermanentDeletionDialog
          isOpen={deletionDialog.isOpen && deletionDialog.type === 'permanent'}
          onClose={() => setDeletionDialog({ isOpen: false, type: 'permanent', user: null })}
          onConfirm={() => {
            if (deletionDialog.user) {
              permanentDeleteUserMutation.mutate(deletionDialog.user.id);
            }
          }}
          title="Permanently Delete User"
          description="This will permanently delete the user and all associated data. This action cannot be undone."
          itemName={deletionDialog.user ? `${deletionDialog.user.name} (${deletionDialog.user.email})` : ''}
          isLoading={permanentDeleteUserMutation.isPending}
          consequences={[
            'User account will be completely removed',
            'All user data will be permanently deleted',
            'All associated records will be cleaned up',
            'This action cannot be reversed'
          ]}
          requiresConfirmation={true}
        />

        <RestoreDialog
          isOpen={restoreDialog.isOpen}
          onClose={() => setRestoreDialog({ isOpen: false, user: null })}
          onConfirm={() => {
            if (restoreDialog.user) {
              restoreUserMutation.mutate(restoreDialog.user.id);
            }
          }}
          title="Restore User"
          description="Are you sure you want to restore this user? This will make the user active and visible again."
          itemName={restoreDialog.user ? `${restoreDialog.user.name} (${restoreDialog.user.email})` : ''}
          isLoading={restoreUserMutation.isPending}
        />

        <SuspendConfirmationDialog
          isOpen={suspendDialog.isOpen}
          onClose={() => setSuspendDialog({ isOpen: false, user: null })}
          onConfirm={() => {
            if (suspendDialog.user) {
              suspendUserMutation.mutate(suspendDialog.user.id);
            }
          }}
          title="Suspend User"
          description="Are you sure you want to suspend this user? They will not be able to sign in until reactivated."
          itemName={
            suspendDialog.user
              ? `${suspendDialog.user.name} (${suspendDialog.user.email})`
              : ''
          }
          isLoading={suspendUserMutation.isPending}
          isHighRisk={
            suspendDialog.user?.role === 'org_admin' ||
            suspendDialog.user?.role === 'platform_admin' ||
            suspendDialog.user?.role === 'super_admin'
          }
          consequences={[
            'User will be blocked from signing in',
            'Active sessions will stop working on the next request',
            'User data and history will be preserved',
            'An administrator can reactivate the account later',
          ]}
        />

        <UserModal
          isOpen={userModal.isOpen}
          onClose={() => setUserModal({ isOpen: false, user: null })}
          user={userModal.user}
          organizations={(organizationsData as { organizations: Organization[] })?.organizations || []}
          onSave={handleUserSave}
          isLoading={createUserMutation.isPending || updateUserMutation.isPending || isLoadingOrganizations}
        />
      </div>
    </DashboardLayout>
  );
}
