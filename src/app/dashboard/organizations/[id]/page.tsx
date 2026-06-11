'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { platformAdminApi, superAdminApi } from '@/lib/api';
import {
  Organization,
  OrganizationDetailApiResponse,
  AuditLogsApiResponse,
  UsersApiResponse,
  QuotasApiResponse,
} from '@/types/api';
import {
  ArrowLeft,
  Users,
  Building2,
  Settings,
  Database,
  DollarSign,
  Crown,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Ban,
  Edit,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';
import { getErrorMessage } from '@/utils/error';
import InviteUserModal from '@/components/ui/InviteUserModal';
import QuotaLimitsModal from '@/components/ui/QuotaLimitsModal';
import UserTable from '@/components/ui/UserTable';
import { SuspendConfirmationDialog } from '@/components/ui/DeletionDialog';

interface OrganizationDetails extends Organization {
  billing_account_id?: number;
  total_users?: number;
  active_users?: number;
  user_growth?: number;
  last_activity?: string;
  created_by?: string;
  is_active?: boolean;
  suspended_at?: string | null;
  suspended_by?: number | null;
  reactivated_at?: string | null;
  reactivated_by?: number | null;
}

interface TabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ComponentType<any>;
  count?: number;
}

function Tab({ active, onClick, children, icon: Icon, count }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors',
        active
          ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
          : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 hover:border-bg-light-6 dark:hover:border-gray-600'
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
      {count !== undefined && (
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs',
          active ? 'bg-brand-navy dark:bg-blue-600 text-white' : 'bg-bg-light-4 dark:bg-gray-600 text-text-secondary dark:text-gray-300'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className = ''
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={`w-4 h-4 ${
                  trend === 'up' ? 'text-status-success' :
                  trend === 'down' ? 'text-status-error' :
                  'text-gray-medium-2'
                }`}
              />
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-status-success' :
                trend === 'down' ? 'text-status-error' :
                'text-gray-medium-2'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-brand-navy bg-opacity-10 dark:bg-blue-500 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-brand-navy dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orgId = parseInt(params.id as string);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'quotas' | 'billing'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showSuspendOrgDialog, setShowSuspendOrgDialog] = useState(false);

  // Fetch organization details
  const { data: orgResponse, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => platformAdminApi.getOrganizationDetails(orgId) as Promise<OrganizationDetailApiResponse>,
  });


  const orgData: OrganizationDetails | undefined = orgResponse ? {
    id: orgResponse.id,
    name: orgResponse.name,
    tier: orgResponse.tier ? {
      id: orgResponse.tier_id || 0,
      name: orgResponse.tier,
      slug: orgResponse.tier.toLowerCase(),
      description: `${orgResponse.tier} tier`,
    } : undefined,
    subscription_status: orgResponse.subscription_status || 'unknown',
    service_type: orgResponse.service_type || 'PLATFORM',
    created_at: orgResponse.created_at || '',
    updated_at: orgResponse.updated_at || '',
    deleted_at: orgResponse.deleted_at,
    is_active: orgResponse.is_active,
    suspended_at: orgResponse.suspended_at,
    suspended_by: orgResponse.suspended_by,
    reactivated_at: orgResponse.reactivated_at,
    reactivated_by: orgResponse.reactivated_by,
    total_users: orgResponse.user_count || 0,
    active_users: orgResponse.active_users_count || 0,
    user_growth: orgResponse.user_growth || 0,
    last_activity: orgResponse.last_activity || '',
    billing_account_id: undefined, // Not in current response
    created_by: 'system', // Not in current response
  } : undefined;

  // Fetch organization users
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersApiResponse>({
    queryKey: ['organization-users', orgId],
    queryFn: () => platformAdminApi.getUsers({ filter_org_id: orgId.toString() }) as Promise<UsersApiResponse>,
    enabled: activeTab === 'users',
  });

  // Fetch organization quotas
  const { data: quotasData } = useQuery<QuotasApiResponse>({
    queryKey: ['organization-quotas', orgId],
    queryFn: () => superAdminApi.getOrganizationQuotaSummary(orgId) as Promise<QuotasApiResponse>,
    enabled: activeTab === 'quotas',
  });

  // Fetch recent audit logs for this organization
  const { data: auditLogsData } = useQuery<AuditLogsApiResponse>({
    queryKey: ['organization-audit-logs', orgId],
    queryFn: () => platformAdminApi.getAuditLogs({ org_id: orgId, limit: 5 }) as Promise<AuditLogsApiResponse>,
    enabled: activeTab === 'overview',
  });

  // Organization actions
  const suspendOrgMutation = useMutation({
    mutationFn: () => platformAdminApi.suspendOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] }); // Invalidate list page cache
      toast.success('Organization suspended successfully');
      setShowSuspendOrgDialog(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to suspend organization'));
    },
  });

  const reactivateOrgMutation = useMutation({
    mutationFn: () => platformAdminApi.reactivateOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] }); // Invalidate list page cache
      toast.success('Organization reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to reactivate organization'));
    },
  });

  // User creation mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => platformAdminApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('User invited successfully. An invitation email has been sent.');
      setShowInviteModal(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to invite user'));
    },
  });

    // Quota limits update mutation using new batch API
  const updateQuotaLimitsMutation = useMutation({
    mutationFn: async (quotaUpdates: { [quotaType: string]: number | null }) => {
      // Convert to batch format
      const updates = Object.entries(quotaUpdates).map(([quotaType, customLimit]) => ({
        quota_type: quotaType,
        custom_limit: customLimit
      }));

      // Use the new batch API endpoint
      return superAdminApi.batchUpdateOrgCustomLimits(orgId, { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-quotas', orgId] });
      toast.success('Quota limits updated successfully');
      setShowQuotaModal(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update quota limits'));
    },
  });

  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!orgData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Organization Not Found</h2>
          <p className="text-text-secondary">The organization you're looking for doesn't exist.</p>
          <Link href="/dashboard/organizations" className="btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/organizations"
              className="p-2 text-text-secondary hover:text-brand-navy transition-colors rounded-lg hover:bg-bg-light-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-navy rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {orgData.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">{orgData.name}</h1>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>ID: {orgData.id}</span>
                  <span>•</span>
                  <span>Created {format(new Date(orgData.created_at!), 'MMM dd, yyyy')}</span>
                  {orgData.tier && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Crown className="w-4 h-4" />
                        <span>{orgData.tier.name} Tier</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {orgData.is_active ? (
              <button
                onClick={() => setShowSuspendOrgDialog(true)}
                className="btn-danger flex items-center gap-2"
                disabled={suspendOrgMutation.isPending}
              >
                {suspendOrgMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Suspending...
                  </>
                ) : (
                  <>
                <Ban className="w-4 h-4" />
                Suspend
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => reactivateOrgMutation.mutate()}
                className="bg-status-success hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center gap-2"
                disabled={reactivateOrgMutation.isPending}
              >
                {reactivateOrgMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Reactivating...
                  </>
                ) : (
                  <>
                <CheckCircle className="w-4 h-4" />
                Reactivate
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {!orgData.is_active && (
          <div className="card border-status-error border-2 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-status-error" />
              <div>
                <h3 className="font-medium text-status-error">Organization Suspended</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This organization is currently suspended and users cannot access the platform.
                  {orgData.suspended_at && (
                    <span className="block mt-1">
                      Suspended on {format(new Date(orgData.suspended_at), 'MMM dd, yyyy')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Users"
            value={orgData.total_users || 0}
            subtitle={`${orgData.active_users || 0} active users`}
            icon={Users}
            trend={orgData.user_growth && orgData.user_growth > 0 ? "up" : "neutral"}
            trendValue={orgData.user_growth ? `+${orgData.user_growth} this month` : "No growth"}
          />

          <StatCard
            title="Last Activity"
            value={orgData.last_activity ? format(new Date(orgData.last_activity), 'MMM dd') : 'Never'}
            subtitle="User activity"
            icon={Activity}
            trend="neutral"
            trendValue={orgData.last_activity ? format(new Date(orgData.last_activity), 'MMM dd, yyyy') : 'No activity'}
          />
          <StatCard
            title="Tier Status"
            value={orgData.tier?.name || 'No Tier'}
            subtitle={orgData.is_active ? 'Active' : 'Suspended'}
            icon={Crown}
            trend={orgData.is_active ? "up" : "down"}
            trendValue={orgData.is_active ? "Organization active" : "Organization suspended"}
          />
        </div>

        {/* Tabs */}
        <div className="card p-0">
          <div className="border-b border-bg-light-6 dark:border-gray-600 px-6">
            <div className="flex space-x-6">
              <Tab
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={Building2}
              >
                Overview
              </Tab>
              <Tab
                active={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
                icon={Users}
                count={orgData.total_users}
              >
                Users
              </Tab>
              <Tab
                active={activeTab === 'quotas'}
                onClick={() => setActiveTab('quotas')}
                icon={Database}
              >
                Quotas & Limits
              </Tab>
              <Tab
                active={activeTab === 'billing'}
                onClick={() => setActiveTab('billing')}
                icon={DollarSign}
              >
                Billing
              </Tab>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Organization Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-text-secondary" />
                        <span className="text-text-primary">
                          Created {format(new Date(orgData.created_at!), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-text-secondary" />
                        <span className="text-text-primary">
                          Last updated {format(new Date(orgData.updated_at!), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-text-secondary" />
                        <span className="text-text-primary">
                          Billing Account #{orgData.billing_account_id || 'Not linked'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {auditLogsData?.audit_logs && auditLogsData.audit_logs.length > 0 ? (
                      auditLogsData.audit_logs.map((log, index) => {
                        const getActivityType = (action: string) => {
                          if (action.includes('suspend') || action.includes('delete')) return 'warning';
                          if (action.includes('create') || action.includes('reactivate') || action.includes('upgrade')) return 'success';
                          return 'info';
                        };

                        const getReadableAction = (action: string) => {
                          const actionMap: { [key: string]: string } = {
                            'create_user': 'User created',
                            'suspend_user': 'User suspended',
                            'reactivate_user': 'User reactivated',
                            'set_org_tier': 'Tier updated',
                            'Set Org Tier': 'Tier updated',
                            'suspend_organization': 'Organization suspended',
                            'reactivate_organization': 'Organization reactivated',
                            'create_organization': 'Organization created',
                            'delete_user': 'User deleted',
                          };
                          return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        };

                        const activityType = getActivityType(log.action);
                        const readableAction = getReadableAction(log.action);

                        return (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-bg-light-6 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                                activityType === 'warning' ? 'bg-status-warning' :
                                activityType === 'success' ? 'bg-status-success' :
                            'bg-status-info'
                          }`}></div>
                          <div>
                                <p className="text-sm font-medium text-text-primary">{readableAction}</p>
                                {log.actor_name && <p className="text-xs text-text-secondary">by {log.actor_name}</p>}
                          </div>
                        </div>
                            <span className="text-xs text-text-secondary">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-text-secondary">No recent activity found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Organization Users</h3>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Invite User
                    </button>
                </div>

                {/* Users Table */}
                <div className="card p-0 overflow-hidden">
                  <UserTable
                    users={usersData?.users || []}
                    isLoading={usersLoading}
                    showOrganization={true}
                    showActions={false}
                    showLastAction={true}
                    emptyMessage="No users found in this organization"
                    emptyDescription={`Total users: ${orgData.total_users || 0}`}
                  />
                </div>
              </div>
            )}

            {activeTab === 'quotas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Quota Usage & Limits</h3>
                  <div className="flex items-center gap-2">
                                          <button
                        onClick={() => setShowQuotaModal(true)}
                        className="btn-primary flex items-center gap-2"
                      >
                    <Settings className="w-4 h-4" />
                        Edit Limits
                  </button>
                </div>
                </div>

                {/* Quotas Display */}
                {quotasData?.quotas && quotasData.quotas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quotasData.quotas.map((quota) => (
                      <div key={quota.quota_type} className="card">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-text-primary capitalize">
                            {quota.quota_type.replace('_', ' ')}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            quota.usage_percent >= 100 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            quota.usage_percent >= 80 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {quota.usage_percent >= 100 ? 'Exceeded' :
                             quota.usage_percent >= 80 ? 'Warning' : 'Healthy'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Used:</span>
                            <span className="text-text-primary font-medium">
                              {quota.used?.toLocaleString() || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Limit:</span>
                            <span className="text-text-primary font-medium">
                              {quota.limit === -1 ? '∞' : quota.limit?.toLocaleString() || 0}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          {quota.limit !== -1 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  quota.usage_percent >= 100 ? 'bg-red-500' :
                                  quota.usage_percent >= 80 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(quota.usage_percent || 0, 100)}%` }}
                              ></div>
                            </div>
                          )}

                          <div className="text-xs text-text-secondary mt-2">
                            {quota.usage_percent !== undefined ? `${quota.usage_percent.toFixed(1)}% used` : 'No usage data'}
                          </div>
                        </div>
                      </div>
                        ))}
                      </div>
                    ) : (
                <div className="text-center py-8 text-text-secondary">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No quota data available</p>
                    <p className="text-sm mt-2">Quotas will appear here once configured</p>
                </div>
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Billing & Subscription</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">Subscription Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Plan:</span>
                        <span className="text-text-primary font-medium">{orgData.tier?.name || 'No Plan'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Status:</span>
                        <span className={`font-medium ${
                          orgData.is_active ? 'text-status-success' : 'text-status-error'
                        }`}>
                          {orgData.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Subscription:</span>
                        <span className="text-text-primary font-medium">
                          {orgData.subscription_status || 'Not configured'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">Billing Account</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Account ID:</span>
                        <span className="text-text-primary font-medium">
                          {orgData.billing_account_id ? `#${orgData.billing_account_id}` : 'Not linked'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Created:</span>
                        <span className="text-text-primary font-medium">
                          {orgData.created_at ? format(new Date(orgData.created_at), 'MMM dd, yyyy') : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Organization ID:</span>
                        <span className="text-text-primary font-medium">#{orgData.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invite User Modal */}
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organizationName={orgData?.name || ''}
          onSave={createUserMutation.mutate}
          isLoading={createUserMutation.isPending}
          orgId={orgId}
        />

        {/* Quota Edit Modal */}
        <QuotaLimitsModal
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
          organizationName={orgData?.name || ''}
          quotas={(quotasData?.quotas || []).map(q => ({ 
            quota_type: q.quota_type,
            limit: q.limit,
            custom_limit: q.custom_limit ?? undefined,
            effective_limit: q.custom_limit || q.limit,
            used: q.used,
            usage_percent: q.usage_percent
          }))}
          onSave={updateQuotaLimitsMutation.mutate}
          isLoading={updateQuotaLimitsMutation.isPending}
          orgId={orgId}
        />

        <SuspendConfirmationDialog
          isOpen={showSuspendOrgDialog}
          onClose={() => setShowSuspendOrgDialog(false)}
          onConfirm={() => suspendOrgMutation.mutate()}
          title="Suspend Organization"
          description="Are you sure you want to suspend this organization? All users in this organization will lose access until it is reactivated."
          itemName={orgData?.name || ''}
          isLoading={suspendOrgMutation.isPending}
          isHighRisk
          consequences={[
            'All organization users will be blocked from signing in',
            'API access for this organization will be denied',
            'Organization data will be preserved',
            'A platform administrator can reactivate the organization later',
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
