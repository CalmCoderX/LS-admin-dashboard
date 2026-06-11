'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { platformAdminApi } from '@/lib/api';
import {
  AuditLog,
  AuditLogListResponse,
  PaginatedResponse
} from '@/types/api';
import {
  FileText,
  User,
  Building2,
  Shield,
  Eye,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Activity,
  Database,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import SearchFilters, { FilterField } from '@/components/common/SearchFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface AuditFilters {
  search: string;
  actor_name: string;
  org_name: string;
  days: string;
}

const SECURITY_ACTIONS = [
  'login_failed',
  'account_locked',
  'suspicious_activity',
  'privilege_escalation',
  'unauthorized_access',
  'rate_limit_exceeded',
  'ip_blocked',
];

function AuditLogDetail({
  log,
  isExpanded,
  onToggle
}: {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('auth')) return Shield;
    if (action.includes('user')) return User;
    if (action.includes('org')) return Building2;
    if (action.includes('quota')) return Database;
    if (action.includes('IMPERSONATION')) return Eye;
    if (SECURITY_ACTIONS.some(sa => action.includes(sa))) return AlertTriangle;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (SECURITY_ACTIONS.some(sa => action.includes(sa))) return 'text-status-error';
    if (action.includes('login') || action.includes('auth')) return 'text-status-info';
    if (action.includes('IMPERSONATION')) return 'text-status-warning';
    return 'text-text-secondary';
  };

  const Icon = getActionIcon(log.action);
  const actionColor = getActionColor(log.action);

  return (
    <div className="border border-bg-light-6 dark:border-gray-600 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-bg-light-1 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              )}
              <Icon className={`w-5 h-5 ${actionColor}`} />
            </div>
            <div>
              <h4 className="font-medium text-text-primary">
                {log.action}
              </h4>
              <div className="flex items-center gap-4 text-sm text-text-secondary mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>
                    {log.actor_name || log.actor_email || `User #${log.actor_id}` || 'System'}
                  </span>
                </div>
                {(log.org_name || log.org_id) && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{log.org_name || `Org #${log.org_id}`}</span>
                  </div>
                )}
                {(log.city_name || log.country_name) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {[log.city_name, log.country_name].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {log.is_impersonation_action && (
              <span className="badge-warning">Impersonation</span>
            )}
            {SECURITY_ACTIONS.some(sa => log.action.includes(sa)) && (
              <span className="badge-error">Security</span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-bg-light-6 dark:border-gray-600 bg-bg-light-1 dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h5 className="font-medium text-text-primary mb-2">Details</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-secondary">ID:</span>
                  <span className="text-text-primary ml-2">{log.id}</span>
                </div>
                <div>
                  <span className="text-text-secondary">IP Address:</span>
                  <span className="text-text-primary ml-2">{log.ip || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Location:</span>
                  <span className="text-text-primary ml-2">
                    {(log.city_name || log.country_name)
                      ? [log.city_name, log.country_name].filter(Boolean).join(', ')
                      : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">User Agent:</span>
                  <span className="text-text-primary ml-2 break-all">
                    {log.device || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-text-primary mb-2">Changes</h5>
              <div className="space-y-2">
                {log.before && (
                  <div>
                    <span className="text-xs font-medium text-status-error">BEFORE:</span>
                    <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-gray-800 dark:text-red-200 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(log.before, null, 2)}
                    </pre>
                  </div>
                )}
                {log.after && (
                  <div>
                    <span className="text-xs font-medium text-status-success">AFTER:</span>
                    <pre className="text-xs bg-green-50 dark:bg-green-900/20 text-gray-800 dark:text-green-200 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(log.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    actor_name: '',
    org_name: '',
    days: '7',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);
  const debouncedActorName = useDebounce(filters.actor_name, 500);
  const debouncedOrgName = useDebounce(filters.org_name, 500);

  // Fetch audit logs from API (using debounced search)
  const { data: auditLogsData, isLoading: isLoadingLogs, error, isRefetching: isRefetchingLogs } = useQuery({
    queryKey: ['audit-logs', currentPage, pageSize, debouncedSearch, debouncedActorName, debouncedOrgName, filters.days],
    queryFn: async (): Promise<PaginatedResponse<AuditLogListResponse>> => {
      // Convert filters to API params
      const params: Record<string, any> = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };

      // Add filters if they have values
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (debouncedOrgName) {
        params.org_name = debouncedOrgName;
      }
      if (debouncedActorName) {
        params.actor_name = debouncedActorName;
      }
      if (filters.days) {
        params.days = parseInt(filters.days);
      }

      return platformAdminApi.getAuditLogs(params) as Promise<PaginatedResponse<AuditLogListResponse>>;
    },
  });

  // Separate query for stats (less frequent updates)
  const { data: statsData, isLoading: isLoadingStats, isRefetching: isRefetchingStats } = useQuery({
    queryKey: ['audit-logs-stats', filters.days],
    queryFn: async (): Promise<PaginatedResponse<AuditLogListResponse>> => {
      const params: Record<string, any> = {};
      if (filters.days) {
        params.days = parseInt(filters.days);
      }
      return platformAdminApi.getAuditLogs(params) as Promise<PaginatedResponse<AuditLogListResponse>>;
    },
    staleTime: 30000, // Stats don't need to be as fresh, cache for 30 seconds
  });



  const handleFilterChange = (key: keyof AuditFilters, value: string | boolean | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Filter configuration for SearchFilters component
  const filterFields: FilterField[] = [
    {
      id: 'actor_name',
      label: 'User Name',
      value: filters.actor_name,
      onChange: (value) => handleFilterChange('actor_name', value),
      type: 'input',
      placeholder: 'Filter by user name or email',
      options: []
    },
    {
      id: 'org_name',
      label: 'Organization Name',
      value: filters.org_name,
      onChange: (value) => handleFilterChange('org_name', value),
      type: 'input',
      placeholder: 'Filter by organization name',
      options: []
    },
    {
      id: 'days',
      label: 'Time Period',
      value: filters.days,
      onChange: (value) => handleFilterChange('days', value),
      options: [
        { value: '', label: 'All Time' },
        { value: '1', label: 'Last 24 Hours' },
        { value: '7', label: 'Last 7 Days' },
        { value: '30', label: 'Last 30 Days' },
        { value: '90', label: 'Last 90 Days' },
        { value: '365', label: 'Last Year' }
      ]
    }
  ];



  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev =>
      prev.includes(logId)
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs-stats'] });
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, queryClient]);

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs-stats'] });
    toast.success('Audit logs refreshed');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      actor_name: '',
      org_name: '',
      days: '7',
    });
    setCurrentPage(1);
  };

  const auditLogs = auditLogsData?.data?.audit_logs || [];
  const metadata = auditLogsData?.metadata;

  // Stats data from separate query
  const allLogs = statsData?.data?.audit_logs || [];
  const statsMetadata = statsData?.metadata;

  const securityEventCount = auditLogs.filter(log =>
    SECURITY_ACTIONS.some(sa => log.action.includes(sa))
  ).length;

  const allSecurityEventCount = allLogs.filter(log =>
    SECURITY_ACTIONS.some(sa => log.action.includes(sa))
  ).length;

  // Detect if search is being typed (not yet debounced)
  const isSearching = (filters.search !== debouncedSearch && filters.search.length > 0) ||
                     (filters.actor_name !== debouncedActorName && filters.actor_name.length > 0) ||
                     (filters.org_name !== debouncedOrgName && filters.org_name.length > 0);

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand-navy" />
              <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load audit logs</h3>
            <p className="text-sm">Please try again later or contact support if the issue persists.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
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
        <PageHeader
          title="Audit Logs"
          description="Monitor and review all system activities for compliance and security"
          actions={[
            {
              id: 'auto-refresh',
              label: `Auto-refresh: ${autoRefresh ? 'On' : 'Off'}`,
              icon: RefreshCw,
              onClick: handleAutoRefreshToggle,
              variant: 'secondary'
            }
          ]}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefetchingLogs || isRefetchingStats}
        />

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingStats}
          columns={4}
          stats={[
            {
              id: 'total',
              title: 'Total Events',
              value: statsMetadata?.total || 0,
              icon: FileText,
              iconColor: 'text-brand-navy'
            },
            {
              id: 'security',
              title: 'Security Events',
              value: allSecurityEventCount,
              icon: AlertTriangle,
              iconColor: 'text-status-error'
            },
            {
              id: 'impersonations',
              title: 'Impersonations',
              value: allLogs.filter(log => log.is_impersonation_action).length,
              icon: Eye,
              iconColor: 'text-status-warning'
            },
            {
              id: 'today',
              title: "Today's Events",
              value: allLogs.filter(log =>
                      new Date(log.timestamp).toDateString() === new Date().toDateString()
              ).length,
              icon: Activity,
              iconColor: 'text-status-success'
            }
          ]}
        />

        {/* Filters and Search */}
        <SearchFilters
          searchValue={filters.search}
          onSearchChange={(value) => handleFilterChange('search', value)}
          searchPlaceholder="Search by action, user name, or organization..."
          isSearching={isSearching}
          filters={filterFields}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={() => setFilters({ search: '', actor_name: '', org_name: '', days: '7' })}
        />

        {/* Security Events Alert */}
        {securityEventCount > 0 && (
          <div className="card border-status-error border-2 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-status-error" />
              <div>
                <h3 className="font-medium text-status-error">
                  {securityEventCount} Security Event{securityEventCount > 1 ? 's' : ''} Detected
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Review these events immediately for potential security threats.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs */}
        <div className="space-y-4">
          {isLoadingLogs ? (
            // Custom skeleton for audit log cards
            <div className="space-y-4">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <AuditLogDetail
                key={log.id}
                log={log}
                isExpanded={expandedLogs.includes(log.id)}
                onToggle={() => toggleLogExpansion(log.id)}
              />
            ))
          ) : (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No Audit Logs Found</h3>
              <p className="text-text-secondary">
                No audit logs match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoadingLogs && metadata && metadata.total > 0 && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  Showing {((metadata.page - 1) * (metadata.size || pageSize)) + 1} to {Math.min(metadata.page * (metadata.size || pageSize), metadata.total)} of {metadata.total} results
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="input-field py-1 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
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
                  Page {metadata.page || currentPage} of {metadata.total_pages}
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
    </DashboardLayout>
  );
}
