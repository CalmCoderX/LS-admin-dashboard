'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { superAdminApi } from '@/lib/api';

import {
  Shield,
  Ban,
  Globe,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Eye,
  Settings,
  Lock,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getErrorMessage } from '@/utils/error';
import Modal from '@/components/ui/Modal';
import ConfirmationModal from '@/components/common/ConfirmationModal';

// Rate Limiting Types based on backend
interface RateLimitConfig {
  id: number;
  name: string;
  description?: string;
  requests_per_minute: number;
  burst_limit: number;
  block_duration_seconds: number;
  match_type: 'exact' | 'start_with';
  path_pattern: string;
  is_active: boolean;
  priority: number;
  created_by?: number;
  created_at: string;
  updated_at?: string;
}

interface RateLimitLog {
  id: number;
  event_type: string;
  client_ip: string;
  path: string;
  user_agent?: string;
  method: string;
  user_id?: number;
  created_at: string;
  config_name?: string;
}

interface RateLimitStats {
  total_requests: number;
  rate_limited_requests: number;
  blocked_ips: number;
  active_configs: number;
  top_blocked_ips: { ip: string; count: number }[];
  top_rate_limited_paths: { path: string; count: number }[];
}

interface RateLimitConfigFormData {
  name: string;
  description: string;
  path_pattern: string;
  match_type: 'exact' | 'start_with';
  requests_per_minute: number;
  burst_limit: number;
  block_duration_seconds: number;
  priority: number;
  is_active: boolean;
}

interface SecurityFilters {
  search: string;
  is_active?: boolean;
  event_type: string;
  client_ip: string;
  days: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

function SecurityMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900',
    green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900',
    red: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900',
    yellow: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-text-primary dark:text-gray-100 mt-1">{value}</p>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{subtitle}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={`w-4 h-4 ${
                  trend === 'up' ? 'text-status-error' :
                  trend === 'down' ? 'text-status-success' :
                  'text-gray-medium-2'
                }`}
              />
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-status-error' :
                trend === 'down' ? 'text-status-success' :
                'text-gray-medium-2'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color as keyof typeof colorMap] || colorMap.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function RateLimitConfigModal({
  isOpen,
  onClose,
  config,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  config?: RateLimitConfig | null;
  onSave: (data: RateLimitConfigFormData) => void;
}) {
  const isEditing = !!config;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<RateLimitConfigFormData>({
    defaultValues: {
      name: '',
      description: '',
      path_pattern: '/',
      match_type: 'exact',
      requests_per_minute: 60,
      burst_limit: 10,
      block_duration_seconds: 300,
      priority: 0,
      is_active: true,
    }
  });

  // Load config data when editing
  useEffect(() => {
    if (isEditing && config) {
      setValue('name', config.name);
      setValue('description', config.description || '');
      setValue('path_pattern', config.path_pattern);
      setValue('match_type', config.match_type);
      setValue('requests_per_minute', config.requests_per_minute);
      setValue('burst_limit', config.burst_limit);
      setValue('block_duration_seconds', config.block_duration_seconds);
      setValue('priority', config.priority);
      setValue('is_active', config.is_active);
    } else if (!isEditing) {
      reset({
        name: '',
        description: '',
        path_pattern: '/',
        match_type: 'exact',
        requests_per_minute: 60,
        burst_limit: 10,
        block_duration_seconds: 300,
        priority: 0,
        is_active: true,
      });
    }
  }, [config, isEditing, setValue, reset]);

  const onSubmit = (data: RateLimitConfigFormData) => {
    onSave(data);
    onClose();
  };

  // Format duration for display
  const watchedDuration = watch('block_duration_seconds');
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit Rate Limit Configuration' : 'Create Rate Limit Configuration'}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Configuration Name *</label>
            <input
                  {...register('name', { required: 'Configuration name is required' })}
                  placeholder="e.g., API Rate Limit, Login Protection"
              className="input-field"
            />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
          </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Priority</label>
            <input
              type="number"
                  {...register('priority', {
                    min: { value: 0, message: 'Priority must be 0 or higher' },
                    max: { value: 1000, message: 'Priority must be 1000 or lower' }
                  })}
              className="input-field"
              min="0"
              max="1000"
            />
                <p className="text-xs text-gray-500 dark:text-gray-400">Lower numbers have higher priority</p>
                {errors.priority && (
                  <p className="text-sm text-red-600">{errors.priority.message}</p>
                )}
          </div>
        </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Description</label>
          <textarea
                {...register('description')}
            placeholder="Optional description for this rate limit configuration"
                rows={3}
                className="input-field resize-none"
          />
              <p className="text-xs text-gray-500 dark:text-gray-400">Describe when and why this configuration should be applied</p>
            </div>
        </div>

          {/* Path Matching */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Path Matching</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Path Pattern *</label>
            <input
                  {...register('path_pattern', { required: 'Path pattern is required' })}
                  placeholder="/api/auth/login, /api/*, /health"
                  className="input-field font-mono"
                />
                {errors.path_pattern && (
                  <p className="text-sm text-red-600">{errors.path_pattern.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">The URL path pattern to match against</p>
          </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Match Type</label>
            <select
                  {...register('match_type')}
              className="input-field"
            >
              <option value="exact">Exact Match</option>
              <option value="start_with">Starts With</option>
            </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {watch('match_type') === 'exact'
                    ? 'URL must match the pattern exactly'
                    : 'URL must start with the pattern'
                  }
                </p>
              </div>
          </div>
        </div>

          {/* Rate Limiting Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Rate Limiting Rules</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Requests per Minute *</label>
            <input
              type="number"
                  {...register('requests_per_minute', {
                    required: 'Requests per minute is required',
                    min: { value: 1, message: 'Must allow at least 1 request per minute' },
                    max: { value: 10000, message: 'Cannot exceed 10,000 requests per minute' }
                  })}
              className="input-field"
              min="1"
              max="10000"
            />
                {errors.requests_per_minute && (
                  <p className="text-sm text-red-600">{errors.requests_per_minute.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Maximum requests allowed per minute</p>
          </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Burst Limit *</label>
            <input
              type="number"
                  {...register('burst_limit', {
                    required: 'Burst limit is required',
                    min: { value: 1, message: 'Burst limit must be at least 1' },
                    max: { value: 1000, message: 'Burst limit cannot exceed 1,000' }
                  })}
              className="input-field"
              min="1"
              max="1000"
            />
                {errors.burst_limit && (
                  <p className="text-sm text-red-600">{errors.burst_limit.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Additional requests allowed in short bursts</p>
          </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Block Duration *</label>
            <input
              type="number"
                  {...register('block_duration_seconds', {
                    required: 'Block duration is required',
                    min: { value: 60, message: 'Block duration must be at least 60 seconds' },
                    max: { value: 3600, message: 'Block duration cannot exceed 1 hour' }
                  })}
              className="input-field"
              min="60"
              max="3600"
                />
                {errors.block_duration_seconds && (
                  <p className="text-sm text-red-600">{errors.block_duration_seconds.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {watchedDuration ? `${formatDuration(watchedDuration)} block duration` : 'How long to block violating IPs'}
                </p>
              </div>
          </div>
        </div>

          {/* Configuration Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Configuration Settings</h3>

            <div className="flex items-center space-x-2">
          <input
            type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
              />
              <label className="text-sm font-medium text-text-primary">Enable this rate limit configuration</label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Disabled configurations are kept for reference but won't be enforced
            </p>
        </div>

          {/* Configuration Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Configuration Preview</h3>
            <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-text-primary">Path Matching</p>
                  <p className="text-text-secondary font-mono">{watch('path_pattern') || '/'}</p>
                  <p className="text-text-secondary capitalize">{watch('match_type')} match</p>
                </div>
                <div>
                  <p className="font-medium text-text-primary">Rate Limits</p>
                  <p className="text-text-secondary">{watch('requests_per_minute')} req/min + {watch('burst_limit')} burst</p>
                  <p className="text-text-secondary">{formatDuration(watchedDuration || 300)} block duration</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              {isEditing ? 'Update Configuration' : 'Create Configuration'}
          </button>
        </div>
      </form>
      </div>
    </Modal>
  );
}

export default function SecurityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'configs' | 'logs'>('overview');
  const [filters, setFilters] = useState<SecurityFilters>({
    search: '',
    is_active: undefined,
    event_type: '',
    client_ip: '',
    days: 7,
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RateLimitConfig | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch rate limiting statistics
  const { data: rateLimitStats, isLoading: statsLoading, isRefetching: statsRefetching } = useQuery({
    queryKey: ['rate-limit-stats', filters.days],
    queryFn: () => superAdminApi.getRateLimitStats({ days: filters.days }) as Promise<RateLimitStats>,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch rate limit configurations
  const { data: configsData, isLoading: configsLoading } = useQuery({
    queryKey: ['rate-limit-configs', currentPage, pageSize, filters.is_active],
    queryFn: () => superAdminApi.getRateLimitConfigs({
      page: currentPage,
      size: pageSize,
      is_active: filters.is_active,
    }) as Promise<{ configs: RateLimitConfig[]; total: number; page: number; size: number }>,
  });

  // Fetch rate limit logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['rate-limit-logs', currentPage, pageSize, filters],
    queryFn: () => superAdminApi.getRateLimitLogs({
      page: currentPage,
      size: pageSize,
      event_type: filters.event_type || undefined,
      client_ip: filters.client_ip || undefined,
      days: filters.days,
    }) as Promise<{ logs: RateLimitLog[]; total: number; page: number; size: number }>,
    enabled: activeTab === 'logs',
  });

  // Create rate limit configuration
  const createConfigMutation = useMutation({
    mutationFn: (data: RateLimitConfigFormData) => superAdminApi.createRateLimitConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs'] });
      toast.success('Rate limit configuration created successfully');
      setShowConfigModal(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create rate limit configuration'));
    },
  });

  // Update rate limit configuration
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RateLimitConfigFormData> }) =>
      superAdminApi.updateRateLimitConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs'] });
      toast.success('Rate limit configuration updated successfully');
      setEditingConfig(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update rate limit configuration'));
    },
  });

  // Toggle rate limit configuration
  const toggleConfigMutation = useMutation({
    mutationFn: (configId: number) => superAdminApi.toggleRateLimitConfig(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      toast.success('Configuration toggled successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to toggle configuration'));
    },
  });

  // Delete rate limit configuration
  const deleteConfigMutation = useMutation({
    mutationFn: (configId: number) => superAdminApi.deleteRateLimitConfig(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      toast.success('Configuration deleted successfully');
      setConfirmDelete(null);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete configuration'));
    },
  });

  const handleSaveConfig = (data: RateLimitConfigFormData) => {
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data });
    } else {
      createConfigMutation.mutate(data);
    }
  };

  const handleEditConfig = (config: RateLimitConfig) => {
    setEditingConfig(config);
    setShowConfigModal(true);
  };

  const handleToggleConfig = (configId: number) => {
    toggleConfigMutation.mutate(configId);
  };

  const handleDeleteConfig = (configId: number) => {
    setConfirmDelete(configId);
  };

  const confirmDeleteConfig = () => {
    if (confirmDelete) {
      deleteConfigMutation.mutate(confirmDelete);
    }
  };

  const stats = rateLimitStats || {
    total_requests: 0,
    rate_limited_requests: 0,
    blocked_ips: 0,
    active_configs: 0,
    top_blocked_ips: [],
    top_rate_limited_paths: [],
  };

  const configs = configsData?.configs || [];
  const logs = logsData?.logs || [];

  const getSeverityColor = (eventType: string) => {
    switch (eventType) {
      case 'ip_blocked': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900';
      case 'rate_limited': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900';
      case 'burst_limited': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100">Security & Rate Limiting</h1>
            <p className="text-text-secondary dark:text-gray-300">
              Monitor security threats, manage rate limiting, and protect your API endpoints
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] })}
              className="btn-secondary flex items-center gap-2"
              disabled={statsRefetching}
            >
              <RefreshCw className={`w-4 h-4 ${statsRefetching ? 'animate-spin' : ''}`} />
              {statsRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {!statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SecurityMetricCard
              title="Total Requests"
              value={stats.total_requests.toLocaleString()}
              subtitle={`Last ${filters.days} days`}
              icon={Globe}
              color="blue"
            />
            <SecurityMetricCard
              title="Rate Limited"
              value={stats.rate_limited_requests.toLocaleString()}
              subtitle="Requests blocked"
              icon={Ban}
              color="yellow"
            />
            <SecurityMetricCard
              title="Blocked IPs"
              value={stats.blocked_ips}
              subtitle="Unique IPs blocked"
              icon={Shield}
              color="red"
            />
            <SecurityMetricCard
              title="Active Configs"
              value={stats.active_configs}
              subtitle="Rate limit rules"
              icon={Settings}
              color="green"
            />
          </div>
        )}

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
                Overview
              </button>
              <button
                onClick={() => setActiveTab('configs')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'configs'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <Settings className="w-4 h-4" />
                Rate Limit Rules
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'logs'
                    ? 'border-brand-navy dark:border-blue-400 text-brand-navy dark:text-blue-400'
                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200'
                )}
              >
                <Eye className="w-4 h-4" />
                Activity Logs
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Blocked IPs */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">Top Blocked IPs</h3>
                    {stats.top_blocked_ips.length > 0 ? (
                      <div className="space-y-3">
                        {stats.top_blocked_ips.slice(0, 5).map((item: { ip: string; count: number }, index: number) => (
                          <div key={item.ip} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">#{index + 1}</span>
                              </div>
                              <span className="font-mono text-sm text-text-primary dark:text-gray-100">{item.ip}</span>
                            </div>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">{item.count} blocks</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-secondary dark:text-gray-400 text-center py-8">No blocked IPs in the selected period</p>
                    )}
                  </div>

                  {/* Top Rate Limited Paths */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">Top Rate Limited Paths</h3>
                    {stats.top_rate_limited_paths.length > 0 ? (
                      <div className="space-y-3">
                        {stats.top_rate_limited_paths.slice(0, 5).map((item: { path: string; count: number }, index: number) => (
                          <div key={item.path} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">#{index + 1}</span>
                              </div>
                              <span className="font-mono text-sm text-text-primary dark:text-gray-100 truncate">{item.path}</span>
                            </div>
                            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{item.count} hits</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-secondary dark:text-gray-400 text-center py-8">No rate limited paths in the selected period</p>
                    )}
                  </div>
                </div>

                {/* Time Range Filter */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100">Statistics Period</h3>
                  <select
                    value={filters.days}
                    onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                    className="input-field max-w-xs"
                  >
                    <option value={1}>Last 24 hours</option>
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Rate Limit Rules Tab */}
            {activeTab === 'configs' && (
              <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select
                      value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        is_active: e.target.value === 'all' ? undefined : e.target.value === 'true'
                      }))}
                      className="input-field"
                    >
                      <option value="all">All Configurations</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setEditingConfig(null);
                      setShowConfigModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Configuration
                  </button>
                </div>

                {/* Configurations List */}
                <div className="space-y-4">
                  {configsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                      <p className="text-text-secondary dark:text-gray-400">Loading configurations...</p>
                    </div>
                  ) : configs.length === 0 ? (
                    <div className="text-center py-8">
                      <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-text-secondary dark:text-gray-400">No rate limit configurations found</p>
                      <button
                        onClick={() => {
                          setEditingConfig(null);
                          setShowConfigModal(true);
                        }}
                        className="btn-primary mt-4"
                      >
                        Create Your First Configuration
                      </button>
                    </div>
                  ) : (
                    configs.map((config: RateLimitConfig) => (
                      <div key={config.id} className="card">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-medium text-text-primary dark:text-gray-100">{config.name}</h4>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                config.is_active
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}>
                                {config.is_active ? 'Active' : 'Inactive'}
                              </div>
                              {config.priority > 0 && (
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                  Priority: {config.priority}
                                </div>
                              )}
                            </div>

                            {config.description && (
                              <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">{config.description}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-text-secondary dark:text-gray-400">Path Pattern:</span>
                                <p className="font-mono text-text-primary dark:text-gray-100">{config.path_pattern}</p>
                              </div>
                              <div>
                                <span className="text-text-secondary dark:text-gray-400">Rate Limit:</span>
                                <p className="text-text-primary dark:text-gray-100">{config.requests_per_minute}/min</p>
                              </div>
                              <div>
                                <span className="text-text-secondary dark:text-gray-400">Burst Limit:</span>
                                <p className="text-text-primary dark:text-gray-100">{config.burst_limit}/sec</p>
                              </div>
                              <div>
                                <span className="text-text-secondary dark:text-gray-400">Block Duration:</span>
                                <p className="text-text-primary dark:text-gray-100">{formatDuration(config.block_duration_seconds)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleToggleConfig(config.id)}
                              disabled={toggleConfigMutation.isPending}
                              className={`p-2 rounded-lg transition-colors ${
                                config.is_active
                                  ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900'
                                  : 'text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800'
                              }`}
                              title={config.is_active ? 'Disable' : 'Enable'}
                            >
                              {config.is_active ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleEditConfig(config)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteConfig(config.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Activity Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">Event Type</label>
                    <select
                      value={filters.event_type}
                      onChange={(e) => setFilters(prev => ({ ...prev, event_type: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">All Events</option>
                      <option value="rate_limited">Rate Limited</option>
                      <option value="burst_limited">Burst Limited</option>
                      <option value="ip_blocked">IP Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">Client IP</label>
                    <input
                      type="text"
                      value={filters.client_ip}
                      onChange={(e) => setFilters(prev => ({ ...prev, client_ip: e.target.value }))}
                      className="input-field"
                      placeholder="Filter by IP address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">Time Range</label>
                    <select
                      value={filters.days}
                      onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                      className="input-field"
                    >
                      <option value={1}>Last 24 hours</option>
                      <option value={7}>Last 7 days</option>
                      <option value={14}>Last 14 days</option>
                      <option value={30}>Last 30 days</option>
                    </select>
                  </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Time</th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Event</th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Client IP</th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Path</th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Method</th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary dark:text-gray-300">Config</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                      {logsLoading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                            <p className="text-text-secondary dark:text-gray-400">Loading logs...</p>
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-text-secondary dark:text-gray-400">No logs found for the selected filters</p>
                          </td>
                        </tr>
                      ) : (
                        logs.map((log: RateLimitLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-3 px-4 text-sm text-text-secondary dark:text-gray-300">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.event_type)}`}>
                                {log.event_type.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-sm text-text-primary dark:text-gray-100">{log.client_ip}</td>
                            <td className="py-3 px-4 font-mono text-sm text-text-primary dark:text-gray-100 max-w-xs truncate" title={log.path}>
                              {log.path}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-text-primary dark:text-gray-100">{log.method}</td>
                            <td className="py-3 px-4 text-sm text-text-secondary dark:text-gray-300">
                              {log.config_name || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RateLimitConfigModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setEditingConfig(null);
        }}
        config={editingConfig}
        onSave={handleSaveConfig}
      />

      <ConfirmationModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteConfig}
        title="Delete Rate Limit Configuration"
        description="Are you sure you want to delete this rate limit configuration? This action cannot be undone."
        confirmationText="Delete"
      />
    </DashboardLayout>
  );
}
