'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDebounce } from '@/hooks/useDebounce';
import {  platformAdminApi, systemApi } from '@/lib/api';
import {
  MaintenanceHistoryResponse,
  MaintenanceHistoryEntry,
  SystemHealthResponse,
  SystemHealthComponent,
  AdminMaintenanceStatusData
} from '@/types/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Database,
  Server,
  Globe,
  Shield,
  Pause,
  Play,
  RefreshCw,
  Wrench,
  Clock,
  HardDrive,
  Wifi,
  BarChart3,
  TrendingUp,
  AlertTriangle as Warning,
  Building2,
  Search,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getErrorMessage } from '@/utils/error';

import Modal from '@/components/ui/Modal';


interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'degraded';
  timestamp: number;
  response_time: number;
  components: {
    database: SystemHealthComponent;
    redis: SystemHealthComponent;
    lambda: SystemHealthComponent;
    storage: SystemHealthComponent;
    virus_scanning: SystemHealthComponent;
  };
  unhealthy_components?: string[];
}



interface MaintenanceRequest {
  enabled: boolean;
  message: string;
  scheduled_end: string;
  maintenance_type: 'platform' | 'organization';
  target_id?: number;
}

// Transform API response to match UI expectations
const transformHealthData = (apiData: SystemHealthResponse): SystemHealth => {
  // Map API status to UI status
  let uiStatus: 'healthy' | 'warning' | 'critical' | 'degraded' = 'healthy';
  if (apiData.status === 'unhealthy') {
    uiStatus = 'critical';
  } else if (apiData.status === 'degraded') {
    uiStatus = 'warning';
  } else {
    uiStatus = 'healthy';
  }

  return {
    status: uiStatus,
    timestamp: apiData.timestamp,
    response_time: apiData.response_time_ms,
    components: apiData.components,
    unhealthy_components: apiData.unhealthy_components,
  };
};





function SystemMetricCard({
  title,
  value,
  unit,
  status,
  icon: Icon,
  trend,
  description
}: {
  title: string;
  value: number | string;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
  trend?: { direction: 'up' | 'down' | 'stable'; value: string };
  description?: string;
}) {
  const statusColors = {
    healthy: 'text-status-success',
    warning: 'text-status-warning',
    critical: 'text-status-error',
  };

  const statusBgColors = {
    healthy: 'bg-green-50 dark:bg-green-900',
    warning: 'bg-yellow-50 dark:bg-yellow-900',
    critical: 'bg-red-50 dark:bg-red-900',
  };

  return (
    <div className={`card ${statusBgColors[status]}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0 bg-white dark:bg-gray-700 bg-opacity-50 rounded-lg flex items-center justify-center">
            <Icon className={`w-4 h-4 ${statusColors[status]}`} />
          </div>
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400">{title}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-text-primary dark:text-gray-100">
            {value}
          </p>
          {unit && <p className="text-sm text-text-secondary dark:text-gray-400 flex-shrink-0">{unit}</p>}
        </div>
        {description && (
          <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1">
            <TrendingUp
              className={`w-4 h-4 ${
                trend.direction === 'up' ? 'text-status-error rotate-0' :
                trend.direction === 'down' ? 'text-status-success rotate-180' :
                'text-gray-medium-2 rotate-90'
              }`}
            />
            <span className="text-sm text-text-secondary dark:text-gray-400">{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}



interface MaintenanceFormData {
  message: string;
  scheduledEnd: string;
  maintenanceType: 'platform' | 'organization';
  targetId: number | undefined;
}

function MaintenanceModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (request: MaintenanceRequest) => void;
  isSubmitting?: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<MaintenanceFormData>({
    defaultValues: {
      message: '',
      scheduledEnd: '',
      maintenanceType: 'platform',
      targetId: undefined,
    }
  });

  const watchedMaintenanceType = watch('maintenanceType');
  const watchedTargetId = watch('targetId');

  const [orgSearch, setOrgSearch] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const orgInputRef = useRef<HTMLInputElement>(null);

  // Debounce search to prevent excessive API calls
  const debouncedOrgSearch = useDebounce(orgSearch, 300);

    // Fetch organizations for the dropdown with debounced search
  const { data: organizationsData, isLoading: organizationsLoading } = useQuery({
    queryKey: ['organizations-list', debouncedOrgSearch],
    queryFn: () => platformAdminApi.getOrganizations({
      limit: 100,
      search: debouncedOrgSearch || undefined
    }) as Promise<{ organizations: Array<{ id: number; name: string; tier?: string }> }>,
    enabled: isOpen && watchedMaintenanceType === 'organization',
  });

  const organizations = organizationsData?.organizations || [];
  const hasOrganizations = organizations.length > 0;
  const selectedOrg = organizations.find((org: any) => org.id === watchedTargetId);

  // Track if search is being debounced
  const isSearching = orgSearch !== debouncedOrgSearch && orgSearch !== '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const container = document.querySelector('.org-search-container');
      if (container && !container.contains(target)) {
        setShowOrgDropdown(false);
      }
    };

    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown]);

  // Reset search and dropdown when modal closes or maintenance type changes
  useEffect(() => {
    if (!isOpen || watchedMaintenanceType !== 'organization') {
      setOrgSearch('');
      setShowOrgDropdown(false);
      setValue('targetId', undefined);
    }
  }, [isOpen, watchedMaintenanceType, setValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        message: '',
        scheduledEnd: '',
        maintenanceType: 'platform',
        targetId: undefined,
      });
      setOrgSearch('');
      setShowOrgDropdown(false);
    }
  }, [isOpen, reset]);

  // Maintain focus after search completes
  useEffect(() => {
    if (showOrgDropdown && !isSearching && orgInputRef.current && document.activeElement !== orgInputRef.current) {
      // Only restore focus if the input was previously focused and dropdown is visible
      const shouldRestoreFocus = orgSearch !== '' || !selectedOrg;
      if (shouldRestoreFocus) {
        orgInputRef.current.focus();
      }
    }
  }, [isSearching, showOrgDropdown, orgSearch, selectedOrg]);

  const onSubmit = (data: MaintenanceFormData) => {
    const request: MaintenanceRequest = {
      enabled: true, // Always enabling maintenance when submitting this form
      message: data.message,
      maintenance_type: data.maintenanceType,
      scheduled_end: data.scheduledEnd,
      target_id: data.targetId,
    };

    onConfirm(request);
    // Form will be reset in the useEffect when modal closes
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Maintenance">
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
            Maintenance Message *
          </label>
          <textarea
            {...register('message', {
              required: 'Maintenance message is required',
              minLength: {
                value: 10,
                message: 'Message must be at least 10 characters long'
              }
            })}
            className="input-field"
            rows={3}
            placeholder="Enter maintenance message for users"
            disabled={isSubmitting}
          />
          {errors.message && (
            <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>
          )}
        </div>

                <div>
          <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
            Maintenance Type *
          </label>
          <select
            {...register('maintenanceType', { required: 'Maintenance type is required' })}
            className="input-field"
            disabled={isSubmitting}
            onChange={(e) => {
              setValue('maintenanceType', e.target.value as 'platform' | 'organization');
              if (e.target.value === 'platform') {
                setValue('targetId', undefined);
                setOrgSearch('');
                setShowOrgDropdown(false);
              }
            }}
          >
            <option value="platform">Platform-wide</option>
            <option value="organization">Organization-specific</option>
          </select>
          {errors.maintenanceType && (
            <p className="text-sm text-red-600 mt-1">{errors.maintenanceType.message}</p>
          )}
        </div>

        {watchedMaintenanceType === 'organization' && (
          <div className="relative org-search-container">
            <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
              Target Organization *
            </label>
            <div className="relative">
              <input
                ref={orgInputRef}
                type="text"
                value={selectedOrg && !showOrgDropdown ? selectedOrg.name : orgSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setOrgSearch(value);
                  setShowOrgDropdown(true);

                  // Clear selection if input is cleared
                  if (!value) {
                    setValue('targetId', undefined);
                  }

                  // If user is typing over a selected org, clear the selection
                  if (selectedOrg && value !== selectedOrg.name) {
                    setValue('targetId', undefined);
                  }
                }}
                onFocus={() => {
                  setShowOrgDropdown(true);
                  // If there's a selected org, clear the search to allow fresh searching
                  if (selectedOrg) {
                    setOrgSearch('');
                  }
                }}
                onBlur={(e) => {
                  // Delay hiding dropdown to allow click on dropdown items
                  setTimeout(() => {
                    if (!orgInputRef.current?.contains(document.activeElement)) {
                      setShowOrgDropdown(false);
                    }
                  }, 150);
                }}
                className="input-field pr-10"
                placeholder={organizationsLoading ? 'Loading organizations...' : 'Search organizations...'}
                disabled={organizationsLoading}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {organizationsLoading || isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-text-secondary" />
                ) : (
                  <Search className="w-4 h-4 text-text-secondary" />
                )}
              </div>

              {/* Dropdown */}
              {showOrgDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {organizationsLoading || isSearching ? (
                    <div className="px-3 py-2 text-sm text-text-secondary flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {organizationsLoading ? 'Loading organizations...' : 'Searching...'}
                    </div>
                  ) : hasOrganizations ? (
                    organizations.map((org: any) => (
                      <button
                        key={org.id}
                        type="button"
                        onMouseDown={(e) => {
                          // Prevent input blur when clicking dropdown item
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setValue('targetId', org.id);
                          setOrgSearch(org.name);
                          setShowOrgDropdown(false);
                          // Return focus to input after selection
                          setTimeout(() => {
                            orgInputRef.current?.focus();
                          }, 0);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                      >
                        <div className="font-medium text-text-primary">{org.name}</div>
                        {org.tier && (
                          <div className="text-sm text-text-secondary">Tier: {org.tier}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-text-secondary">
                      {orgSearch ? 'No organizations found matching your search' : 'Start typing to search organizations'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Custom validation for organization selection */}
            <input
              type="hidden"
              {...register('targetId', {
                validate: (value) => {
                  if (watchedMaintenanceType === 'organization' && value === undefined) {
                    return 'Please select an organization';
                  }
                  return true;
                }
              })}
            />
            {errors.targetId && (
              <p className="text-sm text-red-600 mt-1">{errors.targetId.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
            Scheduled End <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('scheduledEnd', {
              required: 'Scheduled end time is required',
              validate: (value) => {
                if (!value) {
                  return 'Scheduled end time is required';
                }
                  const selectedDate = new Date(value);
                  const now = new Date();
                  return selectedDate > now || 'Scheduled end must be in the future';
              }
            })}
            className="input-field"
            disabled={isSubmitting}
          />
          {errors.scheduledEnd && (
            <p className="text-sm text-red-600 mt-1">{errors.scheduledEnd.message}</p>
          )}
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
            Leave empty for indefinite maintenance
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4" />
                <span>Schedule Maintenance</span>
              </>
            )}
          </button>
        </div>
        </form>
      </div>
    </Modal>
  );
}

export default function SystemPage() {
  const queryClient = useQueryClient();
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance'>('overview');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'platform' | 'organization'>('all');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLimit] = useState(10);


  // Maintenance history query
  const { data: maintenanceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['maintenance-history', historyFilter, historyPage, historyLimit],
    queryFn: () => platformAdminApi.getMaintenanceHistory({
      maintenance_type: historyFilter === 'all' ? undefined : historyFilter,
      skip: historyPage * historyLimit,
      limit: historyLimit
    }) as Promise<MaintenanceHistoryResponse>,
    enabled: activeTab === 'maintenance'
  });


  // System health query (real API)
  const { data: systemHealth, error: healthError, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await systemApi.getHealth({ lang: 'en' }) as SystemHealthResponse;
      return transformHealthData(response);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  // Maintenance status query
  const { data: maintenanceStatus } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => platformAdminApi.getMaintenanceStatus() as Promise<AdminMaintenanceStatusData>,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Enable maintenance mutation
  const enableMaintenanceMutation = useMutation({
    mutationFn: (request: MaintenanceRequest) =>
      platformAdminApi.enablePlatformMaintenance({
        message: request.message,
        scheduled_end: request.scheduled_end
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      toast.success('Maintenance mode enabled');
      setShowMaintenanceModal(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to enable maintenance mode'));
    },
  });

  // Disable maintenance mutation
  const disableMaintenanceMutation = useMutation({
    mutationFn: () => platformAdminApi.disablePlatformMaintenance(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-history'] });
      toast.success('Maintenance mode disabled');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to disable maintenance mode'));
    },
  });

  // Enable organization maintenance mutation
  const enableOrganizationMaintenanceMutation = useMutation({
    mutationFn: (request: MaintenanceRequest) =>
      platformAdminApi.enableOrganizationMaintenance({
        organization_id: request.target_id!,
        message: request.message,
        scheduled_end: request.scheduled_end,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      toast.success('Organization maintenance mode enabled');
      setShowMaintenanceModal(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to enable organization maintenance mode'));
    },
  });

  // Disable organization maintenance mutation
  const disableOrganizationMaintenanceMutation = useMutation({
    mutationFn: (orgId: number) => platformAdminApi.disableOrganizationMaintenance(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      toast.success('Organization maintenance mode disabled');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to disable organization maintenance mode'));
    },
  });



  const handleEnableMaintenance = (request: MaintenanceRequest) => {
    if (request.maintenance_type === 'platform') {
      enableMaintenanceMutation.mutate(request);
    } else {
      enableOrganizationMaintenanceMutation.mutate(request);
    }
  };

  const getSystemStatus = () => {
    if (!systemHealth) return 'unknown';
    return systemHealth.status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100">System Health</h1>
            <p className="text-text-secondary dark:text-gray-300">
              Monitor system performance, services, and maintenance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Overall System Status Badge */}
            <div className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              getSystemStatus() === 'healthy' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
              getSystemStatus() === 'warning' || getSystemStatus() === 'degraded' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
              getSystemStatus() === 'critical' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            )}>
              {getSystemStatus() === 'healthy' && <Activity className="w-4 h-4" />}
              {(getSystemStatus() === 'warning' || getSystemStatus() === 'degraded') && <Warning className="w-4 h-4" />}
              {getSystemStatus() === 'critical' && <AlertTriangle className="w-4 h-4" />}
              {getSystemStatus() === 'unknown' && <Clock className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {getSystemStatus() === 'healthy' && 'System Operational'}
                {(getSystemStatus() === 'warning' || getSystemStatus() === 'degraded') && 'System Degraded'}
                {getSystemStatus() === 'critical' && 'System Critical'}
                {getSystemStatus() === 'unknown' && 'Status Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-bg-light-6 dark:border-gray-600 px-6">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'overview'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                System Overview
              </button>

              <button
                onClick={() => setActiveTab('maintenance')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'maintenance'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <Wrench className="w-4 h-4" />
                Maintenance
              </button>


            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Loading State */}
                {healthLoading && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-brand-navy dark:text-blue-400" />
                    <span className="ml-3 text-lg">Checking system health...</span>
                  </div>
                )}

                {/* Error State */}
                {healthError && (
                  <div className="card bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">Health Check Failed</h3>
                        <p className="text-red-600 dark:text-red-300">
                          {getErrorMessage(healthError, 'Unable to fetch system health status. Please try again.')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Health */}
                {systemHealth && (
                  <>
                    {/* Overall Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <SystemMetricCard
                        title="Overall Status"
                        value={systemHealth.status === 'healthy' ? 'Healthy' : 'Issues Detected'}
                        status={systemHealth.status === 'degraded' ? 'warning' : systemHealth.status === 'healthy' ? 'healthy' : 'critical'}
                        icon={systemHealth.status === 'healthy' ? CheckCircle : AlertTriangle}
                        description={systemHealth.status === 'healthy' ? 'All systems operational' : `${systemHealth.unhealthy_components?.length || 0} components need attention`}
                      />
                      <SystemMetricCard
                        title="Response Time"
                        value={systemHealth.response_time.toFixed(1)}
                        unit="ms"
                        status="healthy"
                        icon={Wifi}
                        description="Health check response time"
                      />
                      <SystemMetricCard
                        title="Last Check"
                        value={new Date(systemHealth.timestamp * 1000).toLocaleTimeString()}
                        status="healthy"
                        icon={Clock}
                        description="Health check timestamp"
                      />
                    </div>

                    {/* Component Status */}
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">System Components</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <SystemMetricCard
                          title="Database"
                          value={systemHealth.components.database.status === 'healthy' ? 'Connected' : 'Issues'}
                          status={systemHealth.components.database.status === 'healthy' ? 'healthy' : 'critical'}
                          icon={Database}
                          description={systemHealth.components.database.details}
                        />
                        <SystemMetricCard
                          title="Redis Cache"
                          value={systemHealth.components.redis.status === 'healthy' ? 'Connected' : 'Issues'}
                          status={systemHealth.components.redis.status === 'healthy' ? 'healthy' : 'critical'}
                          icon={Server}
                          description={systemHealth.components.redis.details}
                        />
                        <SystemMetricCard
                          title="Lambda Functions"
                          value={systemHealth.components.lambda?.status === 'healthy' ? 'Available' : 'Issues'}
                          status={systemHealth.components.lambda?.status === 'healthy' ? 'healthy' : 'critical'}
                          icon={Zap}
                          description={systemHealth.components.lambda?.details || 'Lambda service status'}
                        />
                        <SystemMetricCard
                          title="File Storage"
                          value={systemHealth.components.storage.status === 'healthy' ? 'Accessible' : 'Issues'}
                          status={systemHealth.components.storage.status === 'healthy' ? 'healthy' : 'critical'}
                          icon={HardDrive}
                          description={systemHealth.components.storage.details}
                        />
                        <SystemMetricCard
                          title="Virus Scanning"
                          value={
                            systemHealth.components.virus_scanning?.status === 'healthy' ? 'Active' :
                            systemHealth.components.virus_scanning?.status === 'disabled' ? 'Disabled' :
                            systemHealth.components.virus_scanning?.status === 'unhealthy' ? 'Unavailable' : 'Unknown'
                          }
                          status={
                            systemHealth.components.virus_scanning?.status === 'healthy' ? 'healthy' :
                            systemHealth.components.virus_scanning?.status === 'disabled' ? 'warning' :
                            systemHealth.components.virus_scanning?.status === 'unhealthy' ? 'critical' : 'warning'
                          }
                          icon={Shield}
                          description={systemHealth.components.virus_scanning?.details || 'Virus scanning service status'}
                        />
                      </div>
                    </div>

                    {/* Component Details */}
                    {systemHealth.unhealthy_components && systemHealth.unhealthy_components.length > 0 && (
                      <div className="card bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
                          Components Requiring Attention
                        </h3>
                        <div className="space-y-3">
                          {systemHealth.unhealthy_components.map((component) => {
                            const componentData = systemHealth.components[component as keyof typeof systemHealth.components];
                            return (
                              <div key={component} className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-red-800 dark:text-red-200 capitalize">
                                    {component.replace('_', ' ')}
                                  </p>
                                  <p className="text-red-600 dark:text-red-300 text-sm mt-0.5">
                                    {componentData?.details || 'Component is experiencing issues'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}



            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100">Maintenance Control</h3>
                                    <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowMaintenanceModal(true)}
                      className="btn-secondary flex items-center gap-2"
                      disabled={enableMaintenanceMutation.isPending || enableOrganizationMaintenanceMutation.isPending}
                    >
                      {(enableMaintenanceMutation.isPending || enableOrganizationMaintenanceMutation.isPending) ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4" />
                      )}
                      <span>
                        {(enableMaintenanceMutation.isPending || enableOrganizationMaintenanceMutation.isPending)
                          ? 'Scheduling...' : 'Schedule Maintenance'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Current Maintenance Status */}
                <div className="card">
                  <h4 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">Current Status</h4>
                  {maintenanceStatus ? (
                    <div className="space-y-4">
                      {maintenanceStatus?.platform_maintenances && maintenanceStatus.platform_maintenances.length > 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Pause className="w-5 h-5 text-status-warning" />
                              <div>
                                <p className="font-semibold text-yellow-800 dark:text-yellow-200">Platform Maintenance Active</p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                  {maintenanceStatus.platform_maintenances[0]?.message}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => disableMaintenanceMutation.mutate()}
                              disabled={disableMaintenanceMutation.isPending}
                              className="btn-primary flex items-center gap-2"
                            >
                              {disableMaintenanceMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              <span>{disableMaintenanceMutation.isPending ? 'Disabling...' : 'End Maintenance'}</span>
                            </button>
                          </div>

                          {/* Additional Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                            <div>
                              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Enabled By</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {maintenanceStatus.platform_maintenances[0]?.enabled_by_email || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Started At</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {maintenanceStatus.platform_maintenances[0]?.enabled_at
                                  ? new Date(maintenanceStatus.platform_maintenances[0].enabled_at).toLocaleString()
                                  : 'Unknown'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Scheduled End</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {maintenanceStatus.platform_maintenances[0]?.scheduled_end
                                  ? new Date(maintenanceStatus.platform_maintenances[0].scheduled_end).toLocaleString()
                                  : 'No end time set'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-status-success" />
                          <p className="font-medium text-green-800 dark:text-green-200">System is operational</p>
                        </div>
                      )}

                      {/* Organization Maintenances */}
                      {maintenanceStatus?.organization_maintenances && maintenanceStatus.organization_maintenances.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-text-secondary">Organization Maintenances:</h5>
                            {maintenanceStatus.organization_maintenances.map((orgMaintenance: MaintenanceHistoryEntry, index: number) => (
                            <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="font-semibold text-blue-800 dark:text-blue-200">
                                      {orgMaintenance.target_name || `Organization #${orgMaintenance.target_id}`}
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                      {orgMaintenance.message}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => orgMaintenance.target_id && disableOrganizationMaintenanceMutation.mutate(orgMaintenance.target_id)}
                                  disabled={disableOrganizationMaintenanceMutation.isPending || !orgMaintenance.target_id}
                                  className="btn-secondary btn-sm flex items-center gap-2"
                                >
                                  {disableOrganizationMaintenanceMutation.isPending ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  <span>{disableOrganizationMaintenanceMutation.isPending ? 'Ending...' : 'End'}</span>
                                </button>
                              </div>

                              {/* Additional Organization Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                                <div>
                                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Enabled By</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {orgMaintenance.enabled_by_email || 'Unknown'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Started At</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {orgMaintenance.enabled_at
                                      ? new Date(orgMaintenance.enabled_at).toLocaleString()
                                      : 'Unknown'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Scheduled End</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {orgMaintenance.scheduled_end
                                      ? new Date(orgMaintenance.scheduled_end).toLocaleString()
                                      : 'No end time set'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <Clock className="w-5 h-5 text-text-secondary dark:text-gray-400" />
                      <p className="text-text-secondary dark:text-gray-400">Loading maintenance status...</p>
                    </div>
                  )}
                </div>

                {/* Maintenance History */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-text-primary dark:text-gray-100">Maintenance History</h4>

                    {/* History Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-text-secondary">Filter:</label>
                      <select
                        value={historyFilter}
                        onChange={(e) => {
                          setHistoryFilter(e.target.value as 'all' | 'platform' | 'organization');
                          setHistoryPage(0); // Reset to first page when filter changes
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-navy dark:focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="platform">Platform Only</option>
                        <option value="organization">Organization Only</option>
                      </select>
              </div>
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
                      <span className="ml-2 text-text-secondary">Loading history...</span>
                    </div>
                  ) : maintenanceHistory?.history && maintenanceHistory.history.length > 0 ? (
                      <div className="space-y-3">
                        {maintenanceHistory.history.map((entry: MaintenanceHistoryEntry) => (
                        <div
                          key={entry.id}
                          className={clsx(
                            'p-4 rounded-lg border',
                            entry.type === 'platform'
                              ? 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700'
                              : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {entry.type === 'platform' ? (
                                <Globe className="w-5 h-5 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <Building2 className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className={clsx(
                                    'font-medium',
                                    entry.type === 'platform'
                                      ? 'text-yellow-800 dark:text-yellow-200'
                                      : 'text-blue-800 dark:text-blue-200'
                                  )}>
                                    {entry.type === 'platform' ? 'Platform Maintenance' : `${entry.target_name || 'Organization'} Maintenance`}
                                  </h5>
                                  {(entry.active ?? false) ? (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-full">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-full">
                                      Completed
                                    </span>
                                  )}
                                </div>
                                {entry.message && (
                                  <p className={clsx(
                                    'text-sm mb-3',
                                    entry.type === 'platform'
                                      ? 'text-yellow-700 dark:text-yellow-300'
                                      : 'text-blue-700 dark:text-blue-300'
                                  )}>
                                    {entry.message}
                                  </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className={clsx(
                                      'font-medium mb-1',
                                      entry.type === 'platform'
                                        ? 'text-yellow-800 dark:text-yellow-200'
                                        : 'text-blue-800 dark:text-blue-200'
                                    )}>
                                      Enabled By
                                    </p>
                                    <p className={clsx(
                                      entry.type === 'platform'
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-blue-700 dark:text-blue-300'
                                    )}>
                                      {entry.enabled_by_email || 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className={clsx(
                                      'font-medium mb-1',
                                      entry.type === 'platform'
                                        ? 'text-yellow-800 dark:text-yellow-200'
                                        : 'text-blue-800 dark:text-blue-200'
                                    )}>
                                      Started At
                                    </p>
                                    <p className={clsx(
                                      entry.type === 'platform'
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-blue-700 dark:text-blue-300'
                                    )}>
                                      {format(new Date(entry.enabled_at), 'MMM dd, yyyy HH:mm')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className={clsx(
                                      'font-medium mb-1',
                                      entry.type === 'platform'
                                        ? 'text-yellow-800 dark:text-yellow-200'
                                        : 'text-blue-800 dark:text-blue-200'
                                    )}>
                                      Scheduled End
                                    </p>
                                    <p className={clsx(
                                      entry.type === 'platform'
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-blue-700 dark:text-blue-300'
                                    )}>
                                      {format(new Date(entry.scheduled_end), 'MMM dd, yyyy HH:mm')}
                                    </p>
                                  </div>
                                  {entry.disabled_at && (
                                    <div>
                                      <p className={clsx(
                                        'font-medium mb-1',
                                        entry.type === 'platform'
                                          ? 'text-yellow-800 dark:text-yellow-200'
                                          : 'text-blue-800 dark:text-blue-200'
                                      )}>
                                        Ended At
                                      </p>
                                      <p className={clsx(
                                        entry.type === 'platform'
                                          ? 'text-yellow-700 dark:text-yellow-300'
                                          : 'text-blue-700 dark:text-blue-300'
                                      )}>
                                        {format(new Date(entry.disabled_at), 'MMM dd, yyyy HH:mm')}
                                      </p>
                                      {entry.disabled_by_email && (
                                        <p className={clsx(
                                          'text-xs mt-1',
                                          entry.type === 'platform'
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-blue-600 dark:text-blue-400'
                                        )}>
                                          by {entry.disabled_by_email}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {(maintenanceHistory?.history?.length ?? 0) > historyLimit && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <p className="text-sm text-text-secondary">
                            Showing {historyPage * historyLimit + 1} to {Math.min((historyPage + 1) * historyLimit, maintenanceHistory?.history?.length ?? 0)} of {maintenanceHistory?.history?.length ?? 0} entries
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
                              disabled={historyPage === 0}
                              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setHistoryPage(historyPage + 1)}
                              disabled={(historyPage + 1) * historyLimit >= (maintenanceHistory?.history?.length ?? 0)}
                              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
                      <p className="text-text-secondary">No maintenance history found</p>
                      <p className="text-sm text-text-tertiary mt-1">
                        {historyFilter !== 'all' ? `Try changing the filter to see more results.` : 'Maintenance activities will appear here.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onConfirm={handleEnableMaintenance}
        isSubmitting={enableMaintenanceMutation.isPending || enableOrganizationMaintenanceMutation.isPending}
      />
    </DashboardLayout>
  );
}
