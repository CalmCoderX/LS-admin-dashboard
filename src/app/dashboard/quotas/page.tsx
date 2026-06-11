'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api, superAdminApi } from '@/lib/api';
import {
  QuotaUsageSummary,
  OrganizationsQuotaManagementResponse,
  OrganizationQuotaManagement,
  OrganizationQuotaDetail,
  Organization,
  CustomLimitRequest,
  OrganizationCustomLimitResponse
} from '@/types/api';
import {
  Database,
  AlertTriangle,
  TrendingUp,
  Filter,
  Search,
  Settings,
  RefreshCw,
  Download,
  BarChart3,
  Users,
  Building2,
  Globe,
  Edit,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { QUOTA_STATUS_OPTIONS } from '@/constants/status';
import { getQuotaStatusBadge } from '@/constants/badges';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getErrorMessage } from '@/utils/error';
import { TableSkeleton, StatsCardSkeleton } from '@/components/ui/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const quotaTypeColors = {
  api_calls: '#3b82f6',
  users: '#f59e0b',
  reports: '#8b5cf6',
};

interface QuotaFilters {
  search: string;
  type: string;
  status: string;
  org_id: string;
}

const QUOTA_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'api_calls', label: 'API Calls' },
  { value: 'users', label: 'Users' },
  { value: 'reports', label: 'Reports' },
];


// Extended quota interface
interface QuotaDetail {
  id: number;
  org_id: number;
  org_name: string;
  quota_type: string;
  limit: number;
  used: number;
  custom_limit?: number | null;
  usage_percent: number;
  tier_limit: number;
  last_updated: string;
}

function QuotaActionsDropdown({
  org,
  onSetCustomLimit,
}: {
  org: OrganizationQuotaManagement;
  onSetCustomLimit: (quotaType: string, currentLimit: number | null, tierLimit: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary btn-sm flex items-center gap-2"
        title="Manage custom limits"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 z-20 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide border-b border-gray-200 dark:border-gray-600">
                Set Custom Limits
              </div>
              {org.quotas.map((quota: OrganizationQuotaDetail) => (
                <button
                  key={quota.type}
                  onClick={() => {
                    onSetCustomLimit(quota.type, quota.custom_limit, quota.limit);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{quota.type.replace('_', ' ')}</span>
                    {quota.has_custom_limit && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary group-hover:text-text-primary">
                    {quota.used.toLocaleString()}/{quota.limit === -1 ? '∞' : quota.limit.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CustomLimitModal({
  isOpen,
  onClose,
  orgId,
  quotaType,
  currentLimit,
  tierLimit
}: {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  quotaType: string;
  currentLimit?: number | null;
  tierLimit: number;
}) {
  const queryClient = useQueryClient();
  const [customLimit, setCustomLimit] = useState(currentLimit?.toString() || '');

  const setCustomLimitMutation = useMutation({
    mutationFn: (request: CustomLimitRequest) =>
      api.post<OrganizationCustomLimitResponse>(`/api/sa/org/${orgId}/custom-limit`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['organizations-quota-management'] });
      toast.success('Custom limit updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update custom limit'));
    },
  });

  const clearCustomLimitMutation = useMutation({
    mutationFn: () =>
      api.deleteRaw(`/api/sa/org/${orgId}/custom-limit/${quotaType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['organizations-quota-management'] });
      toast.success('Custom limit cleared successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to clear custom limit'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitValue = customLimit ? parseInt(customLimit) : null;
    setCustomLimitMutation.mutate({
      quota_type: quotaType,
      custom_limit: limitValue,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-custom-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">
            Set Custom Limit - {quotaType.replace('_', ' ').toUpperCase()}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                Custom Limit
              </label>
              <input
                type="number"
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                placeholder={`Default: ${tierLimit}`}
                className="input-field"
              />
              <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                Tier default: {tierLimit.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => clearCustomLimitMutation.mutate()}
                className="btn-secondary"
              >
                Clear Custom
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={setCustomLimitMutation.isPending}
              >
                {setCustomLimitMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function QuotasPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<QuotaFilters>({
    search: '',
    type: '',
    status: '',
    org_id: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuotas, setSelectedQuotas] = useState<number[]>([]);
  const [customLimitModal, setCustomLimitModal] = useState<{
    orgId: number;
    quotaType: string;
    currentLimit?: number | null;
    tierLimit: number;
  } | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'organizations' | 'analytics'>('overview');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fetch quota overview
  const { data: quotaOverview, isLoading: overviewLoading, isRefetching: isRefetchingOverview } = useQuery({
    queryKey: ['quota-overview'],
    queryFn: () => superAdminApi.getQuotaOverview() as Promise<QuotaUsageSummary>,
  });

  // Fetch detailed quotas (using debounced search) - OLD FLAT VIEW
  const { data: quotaDetailsData, isLoading: isLoadingQuotas, isRefetching: isRefetchingQuotaDetails } = useQuery({
    queryKey: ['quota-details', debouncedSearch, filters.type, filters.status, filters.org_id, currentPage, pageSize],
    queryFn: () => superAdminApi.getQuotaDetails({
      page: currentPage,
      size: pageSize,
      search: debouncedSearch || undefined,
      quota_type: filters.type || undefined,
      status: filters.status || undefined,
      org_id: filters.org_id ? parseInt(filters.org_id) : undefined,
    }) as Promise<{ quotas: QuotaDetail[]; total: number; page: number; size: number }>,
    enabled: activeView === 'overview', // Only for overview tab
  });

  // Fetch organization-centric quota management view - NEW ORGANIZED VIEW
  const { data: organizationsQuotaData, isLoading: isLoadingOrgQuotas, isRefetching: isRefetchingOrgQuotas } = useQuery({
    queryKey: ['organizations-quota-management', debouncedSearch, filters.status, currentPage, pageSize],
    queryFn: () => superAdminApi.getOrganizationsQuotaManagement({
      page: currentPage,
      size: pageSize,
      search: debouncedSearch || undefined,
      status: filters.status || undefined,
    }) as Promise<OrganizationsQuotaManagementResponse>,
    enabled: activeView === 'organizations', // Only for organizations tab
  });

  // Fetch usage analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics, isRefetching: isRefetchingQuotaAnalytics } = useQuery({
    queryKey: ['quota-analytics'],
    queryFn: () => superAdminApi.getQuotaAnalytics() as Promise<{
      quota_breakdown: Array<{
        type: string;
        total_orgs: number;
        avg_usage_percent: number;
        orgs_over_80: number;
        orgs_exceeded: number;
      }>;
      top_organizations: Array<{
        org_id: number;
        org_name: string;
        quota_type: string;
        used: number;
        limit: number;
        usage_percent: number;
      }>;
    }>,
    enabled: activeView === 'analytics',
  });

  const quotaDetails = quotaDetailsData?.quotas || [];

  // Detect if search is being typed (not yet debounced)
  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;

  // Reset quotas mutation
  const resetQuotasMutation = useMutation({
    mutationFn: () => superAdminApi.resetQuotas({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quota-overview'] });
      queryClient.invalidateQueries({ queryKey: ['quota-details'] });
      queryClient.invalidateQueries({ queryKey: ['organizations-quota-management'] });
      toast.success('Quota reset initiated successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to reset quotas'));
    },
  });

  const getQuotaIcon = (type: string) => {
    switch (type) {
      case 'api_calls': return Globe;
      case 'users': return Users;
      case 'reports': return BarChart3;
      default: return Database;
    }
  };



  const isQuotaPageRefreshing =
    isRefetchingOverview ||
    isRefetchingQuotaDetails ||
    isRefetchingOrgQuotas ||
    isRefetchingQuotaAnalytics;

  const pieData = quotaOverview?.quota_by_type ?
    Object.entries(quotaOverview.quota_by_type).map(([type, data]: [string, any]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: data.total,
      color: quotaTypeColors[type as keyof typeof quotaTypeColors] || '#8b5cf6',
    })) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Quota & Limits Management</h1>
            <p className="text-text-secondary">
              Monitor and manage resource quotas across organizations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['quota-overview'] });
                queryClient.invalidateQueries({ queryKey: ['quota-details'] });
                queryClient.invalidateQueries({ queryKey: ['organizations-quota-management'] });
                queryClient.invalidateQueries({ queryKey: ['quota-analytics'] });
              }}
              className="btn-secondary flex items-center gap-2"
              disabled={isQuotaPageRefreshing}
            >
              <RefreshCw className={clsx('w-4 h-4', isQuotaPageRefreshing && 'animate-spin')} />
              {isQuotaPageRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {/* <button
              onClick={() => resetQuotasMutation.mutate()}
              className="btn-danger flex items-center gap-2"
              disabled={resetQuotasMutation.isPending}
            >
              <Database className="w-4 h-4" />
              {resetQuotasMutation.isPending ? 'Resetting...' : 'Reset All'}
            </button> */}
          </div>
        </div>

        {/* Critical Alerts */}
        {quotaOverview && quotaOverview.exceeded_quotas > 0 && (
          <div className="card border-status-error border-2 bg-red-50 dark:bg-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-status-error">
                  {quotaOverview.exceeded_quotas} Quota{quotaOverview.exceeded_quotas > 1 ? 's' : ''} Exceeded
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Immediate attention required. Some organizations have exceeded their limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="card p-0">
          <div className="border-b border-bg-light-6 dark:border-gray-600 px-6">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveView('overview')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeView === 'overview'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                System Overview
              </button>
              <button
                onClick={() => setActiveView('organizations')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeView === 'organizations'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <Building2 className="w-4 h-4" />
                Organization Details
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeView === 'analytics'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Usage Analytics
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeView === 'overview' && (
              overviewLoading ? (
                <div className="space-y-6">
                  <StatsCardSkeleton count={4} gridCols={4} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="card">
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              <div className="space-y-1">
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-8" />
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : quotaOverview && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Total Quotas</p>
                        <p className="text-2xl font-bold text-text-primary">{quotaOverview.total_quotas}</p>
                      </div>
                      <Database className="w-8 h-8 text-brand-navy" />
                    </div>
                  </div>
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Exceeded Quotas</p>
                        <p className="text-2xl font-bold text-status-error">{quotaOverview.exceeded_quotas}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-status-error" />
                    </div>
                  </div>
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Near Limit</p>
                        <p className="text-2xl font-bold text-status-warning">{quotaOverview.near_limit_quotas}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-status-warning" />
                    </div>
                  </div>
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Healthy</p>
                        <p className="text-2xl font-bold text-status-success">
                          {quotaOverview.total_quotas - quotaOverview.exceeded_quotas - quotaOverview.near_limit_quotas}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-status-success" />
                    </div>
                  </div>
                </div>

                {/* Quota Type Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quota Distribution Chart */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Quota Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Quota Type Stats */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Quota Type Breakdown</h3>
                    <div className="space-y-3">
                      {Object.entries(quotaOverview.quota_by_type).map(([type, data]: [string, any]) => {
                        const Icon = getQuotaIcon(type);
                        const exceededOrgs = data.exceeded_organizations || [];
                        return (
                          <div key={type} className={clsx(
                            "border rounded-lg p-3",
                            data.exceeded > 0 ? "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900" : "border-transparent"
                          )}>
                            <div className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-text-secondary" />
                                <div>
                                  <p className="font-medium text-text-primary">
                                    {type.replace('_', ' ').toUpperCase()}
                                  </p>
                                  <p className="text-sm text-text-secondary">
                                    {data.average_usage_percent.toFixed(1)}% avg usage ({data.total_used?.toLocaleString() || 0} / {data.total_limit?.toLocaleString() || 0})
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-text-primary">{data.total}</p>
                                <p className="text-xs text-status-error">{data.exceeded} exceeded</p>
                              </div>
                            </div>
                            {/* Show exceeded organizations for this quota type */}
                            {exceededOrgs.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">
                                  Organizations Exceeded:
                                </p>
                                <div className="space-y-1">
                                  {exceededOrgs.map((org: any) => (
                                    <div
                                      key={org.org_id}
                                      className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded px-2 py-1.5"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                                        <span className="font-medium text-red-800 dark:text-red-200">
                                          {org.org_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-red-700 dark:text-red-300">
                                          {org.used.toLocaleString()}/{org.limit === -1 ? '∞' : org.limit.toLocaleString()}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 font-medium">
                                          {org.usage_percent.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              ))
            }



            {activeView === 'organizations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Organization Quota Management</h3>
                  {organizationsQuotaData?.summary && (
                    <div className="text-sm text-text-secondary">
                      Showing {organizationsQuotaData.organizations.length} of {organizationsQuotaData.total} organizations
                    </div>
                  )}
                </div>

                {/* Summary Statistics */}
                {organizationsQuotaData?.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-secondary">Total Organizations</p>
                          <p className="text-xl font-bold text-text-primary">{organizationsQuotaData.summary.total_organizations}</p>
                        </div>
                        <Building2 className="w-6 h-6 text-brand-navy" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-secondary">With Quotas</p>
                          <p className="text-xl font-bold text-text-primary">{organizationsQuotaData.summary.organizations_with_quotas}</p>
                        </div>
                        <Database className="w-6 h-6 text-brand-navy" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-secondary">Without Tier</p>
                          <p className="text-xl font-bold text-status-warning">{organizationsQuotaData.summary.organizations_without_tier}</p>
                        </div>
                        <AlertTriangle className="w-6 h-6 text-status-warning" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-secondary">Quota Types</p>
                          <p className="text-xl font-bold text-text-primary">{organizationsQuotaData.summary.quota_types_available.length}</p>
                        </div>
                        <BarChart3 className="w-6 h-6 text-brand-navy" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization Quota Table */}
                {isLoadingOrgQuotas ? (
                  <TableSkeleton columns={6} rows={5} />
                ) : organizationsQuotaData?.organizations ? (
                  <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-bg-light-6">
                        <thead className="bg-bg-light-2 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Organization
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Tier
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Quotas
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Custom Limits
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6">
                          {organizationsQuotaData.organizations.map((org: OrganizationQuotaManagement) => (
                            <tr key={org.id} className="hover:bg-bg-light-1 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{org.name}</div>
                                  <div className="text-sm text-text-secondary">ID: {org.id}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm">
                                  <div className="font-medium text-text-primary">{org.tier.name}</div>
                                  {org.tier.slug && (
                                    <div className="text-text-secondary">{org.tier.slug}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {org.status === 'critical' || org.status === 'exceeded' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Critical
                                  </span>
                                ) : org.status === 'warning' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Warning
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Healthy
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {org.quotas.map((quota: OrganizationQuotaDetail) => (
                                    <div key={quota.type} className="flex items-center justify-between text-xs">
                                      <span className="text-text-secondary capitalize">
                                        {quota.type.replace('_', ' ')}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-text-primary">
                                          {quota.used.toLocaleString()}/{quota.limit === -1 ? '∞' : quota.limit.toLocaleString()}
                                        </span>
                                        {quota.status === 'exceeded' ? (
                                          <XCircle className="w-3 h-3 text-red-500" />
                                        ) : quota.status === 'critical' ? (
                                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                        ) : quota.status === 'not_configured' ? (
                                          <span className="text-gray-400">—</span>
                                        ) : (
                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {org.quotas.map((quota: OrganizationQuotaDetail) => (
                                    <div key={quota.type} className="flex items-center justify-between text-xs">
                                      <span className="text-text-secondary capitalize">
                                        {quota.type.replace('_', ' ')}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {quota.has_custom_limit ? (
                                          <div className="flex items-center gap-1">
                                            <span className="text-text-primary font-medium">
                                              {quota.custom_limit === -1 ? '∞' : quota.custom_limit?.toLocaleString()}
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                              Custom
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <span className="text-text-secondary">
                                              {quota.limit === -1 ? '∞' : quota.limit.toLocaleString()}
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                              Default
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {org.custom_limits_count === 0 && (
                                    <div className="text-xs text-text-secondary italic">
                                      All default limits
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <QuotaActionsDropdown
                                  org={org}
                                  onSetCustomLimit={(quotaType, currentLimit, tierLimit) =>
                                    setCustomLimitModal({
                                      orgId: org.id,
                                      quotaType,
                                      currentLimit,
                                      tierLimit,
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {organizationsQuotaData && organizationsQuotaData.total > pageSize && (
                      <div className="bg-bg-light-2 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-bg-light-6">
                        <div className="text-sm text-text-secondary">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, organizationsQuotaData.total)} of {organizationsQuotaData.total} organizations
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="btn-secondary btn-sm"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-text-secondary">
                            Page {currentPage} of {Math.ceil(organizationsQuotaData.total / pageSize)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(Math.ceil(organizationsQuotaData.total / pageSize), currentPage + 1))}
                            disabled={currentPage === Math.ceil(organizationsQuotaData.total / pageSize)}
                            className="btn-secondary btn-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card py-12">
                    <div className="text-center text-text-secondary">
                      <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No organizations found</p>
                      <p className="text-sm">Try adjusting your search criteria</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'analytics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary">Current Usage Analytics</h3>

                {isLoadingAnalytics ? (
                  <div className="space-y-6">
                    {/* Loading skeleton for quota breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="card animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div className="card animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div className="card animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>

                    {/* Loading skeleton for top organizations chart */}
                    <div className="card animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </div>
                      <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Quota Type Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {analyticsData?.quota_breakdown?.map((breakdown: any) => (
                    <div key={breakdown.type} className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-text-primary capitalize">
                          {breakdown.type.replace('_', ' ')} Usage
                        </h4>
                        <span className="text-sm text-text-secondary">
                          {breakdown.total_orgs} organizations
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Average Usage:</span>
                          <span className="font-medium">{breakdown.avg_usage_percent}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Over 80%:</span>
                          <span className="text-yellow-600">{breakdown.orgs_over_80}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Exceeded:</span>
                          <span className="text-red-600">{breakdown.orgs_exceeded}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Usage Organizations */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-text-primary">Top Usage Organizations</h4>
                    <span className="text-sm text-text-secondary">By highest quota usage</span>
                  </div>
                  <div className="h-80">
                    {analyticsData?.top_organizations && analyticsData.top_organizations.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.top_organizations.map((org: any) => {
                          const truncateOrgName = (name: string, maxLength: number = 20): string => {
                            if (name.length <= maxLength) return name;
                            // Try to truncate at word boundary
                            const truncated = name.substring(0, maxLength);
                            const lastSpace = truncated.lastIndexOf(' ');
                            return lastSpace > 10 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
                          };

                          return {
                            org: truncateOrgName(org.org_name),
                            fullOrgName: org.org_name,
                            usage: org.usage_percent,
                            quota_type: org.quota_type,
                            used: org.used,
                            limit: org.limit
                          };
                        })}
                        margin={{ bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
                          <XAxis
                            dataKey="org"
                            stroke="#999999"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                          />
                          <YAxis stroke="#999999" />
                                                    <Tooltip
                            formatter={(value, name, props) => [
                              `${value}% (${props.payload.used}/${props.payload.limit})`,
                              `${props.payload.quota_type.replace('_', ' ').toUpperCase()} Usage`
                            ]}
                            labelFormatter={(label, payload) =>
                              `${payload?.[0]?.payload?.fullOrgName || label}`
                            }
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="usage">
                            {analyticsData.top_organizations.map((org: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={quotaTypeColors[org.quota_type as keyof typeof quotaTypeColors] || quotaTypeColors.api_calls} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-text-secondary">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No usage data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom Limit Modal */}
        {customLimitModal && (
          <CustomLimitModal
            isOpen={true}
            onClose={() => setCustomLimitModal(null)}
            orgId={customLimitModal.orgId}
            quotaType={customLimitModal.quotaType}
            currentLimit={customLimitModal.currentLimit}
            tierLimit={customLimitModal.tierLimit}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
