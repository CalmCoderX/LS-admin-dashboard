'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getQuotaStatusColor, getQuotaUsageBarColor } from '@/constants/badges';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { superAdminApi, platformAdminApi } from '@/lib/api';
import {
  Organization,
} from '@/types/api';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';
import { getErrorMessage } from '@/utils/error';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface QuotaDetail {
  quota_type: string;
  used: number;
  limit: number;
  usage_percent: number;
  status: 'normal' | 'warning' | 'exceeded';
  last_reset: string;
  period: string;
}

interface QuotaSummary {
  organization_id: number;
  organization_name: string;
  tier_name: string;
  quotas: QuotaDetail[];
  total_quotas: number;
  exceeded_quotas: number;
  near_limit_quotas: number;
  last_sync: string;
}

function QuotaCard({
  quota,
  onReset
}: {
  quota: QuotaDetail;
  onReset?: (type: string) => void;
}) {

  return (
    <div className={clsx("card border-2", getQuotaStatusColor(quota.status))}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            quota.status === 'exceeded' ? 'bg-red-100 dark:bg-red-800' :
            quota.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-800' : 'bg-green-100 dark:bg-green-800'
          )}>
            <Database className={clsx(
              "w-5 h-5",
              quota.status === 'exceeded' ? 'text-red-600 dark:text-red-400' :
              quota.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary capitalize">
              {quota.quota_type.replace('_', ' ')}
            </h3>
            <p className="text-sm text-text-secondary">{quota.period} limit</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-text-primary">
            {quota.limit === -1 ? '∞' : quota.limit.toLocaleString()}
          </div>
          <div className="text-sm text-text-secondary">
            {quota.used.toLocaleString()} used
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      {quota.limit !== -1 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Usage</span>
            <span className="font-medium">{quota.usage_percent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-bg-light-6 rounded-full h-2">
            <div
              className={clsx("h-2 rounded-full transition-all", getQuotaUsageBarColor(quota.status))}
              style={{ width: `${Math.min(quota.usage_percent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Last Reset */}
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>Reset: {format(new Date(quota.last_reset), 'MMM dd, yyyy')}</span>
        </div>
        {onReset && (
          <button
            onClick={() => onReset(quota.quota_type)}
            className="text-brand-navy hover:text-brand-navy-hover transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className = ''
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        </div>
        <div className="w-12 h-12 bg-brand-navy bg-opacity-10 dark:bg-blue-500 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-brand-navy dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

export default function OrganizationQuotasPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orgId = parseInt(params.id as string);
  const [refreshing, setRefreshing] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [quotaToReset, setQuotaToReset] = useState<string | null>(null);

  // Fetch organization quota summary
  const { data: quotaData, isLoading, error } = useQuery({
    queryKey: ['organization-quotas', orgId],
    queryFn: () => superAdminApi.getOrganizationQuotas(orgId) as Promise<QuotaSummary>,
  });

  // Fetch organization basic info for header
  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => platformAdminApi.getOrganizationDetails(orgId) as Promise<Organization>,
    enabled: !!quotaData,
  });

  // Sync quotas with tier limits
  const syncQuotasMutation = useMutation({
    mutationFn: () => superAdminApi.syncQuotasWithTiers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-quotas', orgId] });
      toast.success('Quotas synced with tier limits successfully');
      setRefreshing(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to sync quotas'));
      setRefreshing(false);
    },
  });

  // Reset specific quota
  const resetQuotaMutation = useMutation({
    mutationFn: (quotaType: string) => superAdminApi.resetQuotas({
      organization_ids: [orgId],
      quota_type: quotaType,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-quotas', orgId] });
      toast.success('Quota reset successfully');
      setResetModalOpen(false);
      setQuotaToReset(null);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to reset quota'));
    },
  });

  const handleRefresh = () => {
    setRefreshing(true);
    syncQuotasMutation.mutate();
  };

  const handleResetQuota = (quotaType: string) => {
    setQuotaToReset(quotaType);
    setResetModalOpen(true);
  };

  const confirmResetQuota = () => {
    if (quotaToReset) {
      resetQuotaMutation.mutate(quotaToReset);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quotaData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to Load Quotas</h2>
          <p className="text-text-secondary">Could not retrieve quota information for this organization.</p>
          <Link href={`/dashboard/organizations/${orgId}`} className="btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Organization
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
              href={`/dashboard/organizations/${orgId}`}
              className="p-2 text-text-secondary hover:text-brand-navy transition-colors rounded-lg hover:bg-bg-light-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-navy rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {quotaData.organization_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  {quotaData.organization_name} - Quotas
                </h1>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>Organization ID: {orgId}</span>
                  <span>•</span>
                  <span>Tier: {quotaData.tier_name}</span>
                  <span>•</span>
                  <span>Last Sync: {format(new Date(quotaData.last_sync), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
              {refreshing ? 'Syncing...' : 'Sync with Tier'}
            </button>

          </div>
        </div>

        {/* Alert for quota issues */}
        {(quotaData.exceeded_quotas > 0 || quotaData.near_limit_quotas > 0) && (
          <div className="card border-status-warning border-2 bg-yellow-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
              <div>
                <h3 className="font-medium text-status-warning">Quota Attention Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {quotaData.exceeded_quotas > 0 &&
                    `${quotaData.exceeded_quotas} quota${quotaData.exceeded_quotas > 1 ? 's' : ''} exceeded. `
                  }
                  {quotaData.near_limit_quotas > 0 &&
                    `${quotaData.near_limit_quotas} quota${quotaData.near_limit_quotas > 1 ? 's' : ''} near limit.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Quotas"
            value={quotaData.total_quotas}
            subtitle="Tracked quotas"
            icon={Database}
          />
          <StatCard
            title="Exceeded Quotas"
            value={quotaData.exceeded_quotas}
            subtitle="Over limit"
            icon={AlertTriangle}
            className={quotaData.exceeded_quotas > 0 ? 'border-status-error border-2' : ''}
          />
          <StatCard
            title="Near Limit"
            value={quotaData.near_limit_quotas}
            subtitle="80%+ usage"
            icon={TrendingUp}
            className={quotaData.near_limit_quotas > 0 ? 'border-status-warning border-2' : ''}
          />
          <StatCard
            title="Healthy Quotas"
            value={quotaData.total_quotas - quotaData.exceeded_quotas - quotaData.near_limit_quotas}
            subtitle="Under 80% usage"
            icon={CheckCircle}
          />
        </div>

        {/* Quota Details */}
        <div className="card">
          <div className="p-6 border-b border-bg-light-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Quota Details</h2>
                <p className="text-text-secondary mt-1">
                  Current usage and limits for all quota types
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-3 h-3 bg-status-success rounded-full"></div>
                  <span>Normal</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-3 h-3 bg-status-warning rounded-full"></div>
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-3 h-3 bg-status-error rounded-full"></div>
                  <span>Exceeded</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {quotaData.quotas.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Quotas Found</p>
                <p className="text-sm mt-2">This organization has no quota tracking configured.</p>
                <button
                  onClick={handleRefresh}
                  className="btn-primary mt-4"
                  disabled={refreshing}
                >
                  {refreshing ? 'Syncing...' : 'Initialize Quotas'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {quotaData.quotas.map((quota) => (
                  <QuotaCard
                    key={quota.quota_type}
                    quota={quota}
                    onReset={handleResetQuota}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Quota Confirmation Modal */}
      <ConfirmationModal
        isOpen={resetModalOpen}
        onClose={() => {
          setResetModalOpen(false);
          setQuotaToReset(null);
        }}
        onConfirm={confirmResetQuota}
        title="Reset Quota"
        description={`Are you sure you want to reset the ${quotaToReset?.replace('_', ' ') || ''} quota for this organization? This will reset the usage counter to 0.`}
        type="warning"
        confirmLabel="Reset Quota"
        cancelLabel="Cancel"
        isLoading={resetQuotaMutation.isPending}
        icon={RefreshCw}
      />
    </DashboardLayout>
  );
}
