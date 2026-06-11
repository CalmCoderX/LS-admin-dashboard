'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api, superAdminApi } from '@/lib/api';
import {
  Users,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Shield,
  Database,
  FileText,
  CheckCircle,
  XCircle,
  BarChart3,
  Package,
  Clock,
  DollarSign,
  UserCheck,
  UserCog,
  Server,
  Settings,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardStats, QuotaUsageSummary, BillingAccountStatsResponse, SubscriptionStatsResponse } from '@/types/api';

// Real dashboard stats from API
const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => superAdminApi.getDashboardOverview() as Promise<DashboardStats>,
  });
};

const useQuotaOverview = () => {
  return useQuery({
    queryKey: ['quota-overview'],
    queryFn: () => api.get<QuotaUsageSummary>('/api/sa/quotas/overview'),
  });
};

const useBillingStats = () => {
  return useQuery({
    queryKey: ['billing-stats'],
    queryFn: () => api.get<BillingAccountStatsResponse>('/api/billing/stats/billing-accounts'),
  });
};

const useSubscriptionStats = () => {
  return useQuery({
    queryKey: ['subscription-stats'],
    queryFn: () => api.get<SubscriptionStatsResponse>('/api/billing/stats/subscriptions'),
  });
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className = '',
  href
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  href?: string;
}) {
  const content = (
    <div className={`card hover:shadow-custom-lg transition-shadow duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-text-primary dark:text-gray-100 mt-1">{value}</p>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{subtitle}</p>
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
        <div className="w-12 h-12 bg-brand-navy dark:bg-blue-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-brand-navy dark:text-blue-400" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color = 'brand-navy'
}: {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color?: string;
}) {
  // Define color mappings with proper dark mode support
  const colorMap = {
    'brand-navy': {
      bg: 'bg-brand-navy dark:bg-blue-600 bg-opacity-10 dark:bg-opacity-20',
      text: 'text-brand-navy dark:text-blue-400'
    },
    'green': {
      bg: 'bg-green-500 dark:bg-green-600 bg-opacity-10 dark:bg-opacity-20',
      text: 'text-green-500 dark:text-green-400'
    },
    'red': {
      bg: 'bg-red-500 dark:bg-red-600 bg-opacity-10 dark:bg-opacity-20',
      text: 'text-red-500 dark:text-red-400'
    },
    'purple': {
      bg: 'bg-purple-500 dark:bg-purple-600 bg-opacity-10 dark:bg-opacity-20',
      text: 'text-purple-500 dark:text-purple-400'
    },
    'orange': {
      bg: 'bg-orange-500 dark:bg-orange-600 bg-opacity-10 dark:bg-opacity-20',
      text: 'text-orange-500 dark:text-orange-400'
    }
  };

  const colorClasses = colorMap[color as keyof typeof colorMap] || colorMap['brand-navy'];

  return (
    <Link href={href} className="block">
      <div className="card hover:shadow-custom-lg transition-all duration-200 hover:scale-105">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorClasses.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AlertCard({
  type,
  title,
  message,
  action
}: {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    warning: AlertTriangle,
    error: XCircle,
    info: CheckCircle,
  };

  const Icon = icons[type];

  return (
    <div className={`p-4 rounded-lg border ${colors[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm mt-1">{message}</p>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: quotaStats, isLoading: quotaLoading } = useQuotaOverview();
  const { data: billingStats } = useBillingStats();
  const { data: subscriptionStats } = useSubscriptionStats();

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100">Dashboard</h1>
            <p className="text-text-secondary dark:text-gray-300">
              Welcome back, {user?.name || user?.email}.
            </p>
          </div>
          {dashboardStats?.system_health && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              dashboardStats.system_health === 'healthy'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">
                {dashboardStats.system_health === 'healthy' ? 'System Operational' : 'System Issues'}
              </span>
            </div>
          )}
        </div>

        {/* System Alerts */}
        {dashboardStats?.quota_alerts && dashboardStats.quota_alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">System Alerts</h2>
            <div className="space-y-3">
              {dashboardStats.quota_alerts.map((alert) => (
                <AlertCard
                  key={`${alert.org_id}-${alert.quota_type}`}
                  type="warning"
                  title="Quota Usage Alert"
                  message={`${alert.org_name} has reached ${alert.usage_percent}% of their ${alert.quota_type} limit.`}
                  action={
                    <Link
                      href={`/dashboard/organizations/${alert.org_id}/quotas`}
                      className="text-sm text-yellow-700 underline hover:no-underline"
                    >
                      View Details →
                    </Link>
                  }
                />
              ))}

              {/* Expiring Activation Codes Alert */}
              {dashboardStats.activation_codes_stats?.expiring_codes && dashboardStats.activation_codes_stats.expiring_codes > 0 && (
                <AlertCard
                  type="warning"
                  title="Codes Expiring Soon"
                  message={`${dashboardStats.activation_codes_stats.expiring_codes} activation codes will expire within 7 days`}
                  action={
                    <Link
                      href="/dashboard/activation-codes"
                      className="text-sm text-yellow-700 underline hover:no-underline"
                    >
                      Manage Codes →
                    </Link>
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={dashboardStats?.total_users.toLocaleString() || '0'}
            subtitle={`${dashboardStats?.active_users || 0} active`}
            icon={Users}
            trend={dashboardStats?.user_growth?.percent_change !== undefined && dashboardStats.user_growth.percent_change >= 0 ? 'up' : 'down'}
            trendValue={dashboardStats?.user_growth?.formatted || 'No data'}
            href="/dashboard/users"
          />
          <StatCard
            title="Organizations"
            value={dashboardStats?.total_organizations || '0'}
            subtitle={`${dashboardStats?.active_organizations || 0} active`}
            icon={Building2}
            trend={dashboardStats?.organization_growth?.percent_change !== undefined && dashboardStats.organization_growth.percent_change >= 0 ? 'up' : 'down'}
            trendValue={dashboardStats?.organization_growth?.formatted || 'No data'}
            href="/dashboard/organizations"
          />
          <StatCard
            title="System Health"
            value={dashboardStats?.system_health === 'healthy' ? 'Healthy' :
                   dashboardStats?.system_health === 'warning' ? 'Warning' : 'Critical'}
            subtitle={dashboardStats?.system_health_details ?
                      `${dashboardStats.system_health_details.healthy_quotas}/${dashboardStats.system_health_details.total_quotas} quotas healthy` :
                      'Checking system status'}
            icon={Activity}
            trend="neutral"
            trendValue={'Status monitoring'}
            href="/dashboard/system"
          />
          <StatCard
            title="Security Events"
            value={dashboardStats?.security_details?.recent_events?.toString() || '0'}
            subtitle={`${dashboardStats?.security_details?.active_configs || 0} active rules`}
            icon={Shield}
            trend={dashboardStats?.security_details?.recent_blocks && dashboardStats.security_details.recent_blocks > 0 ? 'up' : 'neutral'}
            trendValue={dashboardStats?.security_details?.recent_blocks && dashboardStats.security_details.recent_blocks > 0 ?
                        `${dashboardStats.security_details.recent_blocks} blocked (24h)` :
                        'Protection active'}
            href="/dashboard/security"
          />
          {dashboardStats?.activation_codes_stats && (
            <StatCard
              title="Activation Codes"
              value={dashboardStats.activation_codes_stats.total_codes}
              subtitle={`${dashboardStats.activation_codes_stats.active_codes} active`}
              icon={Ticket}
              trend={dashboardStats.activation_codes_stats.recent_activations > 0 ? 'up' : 'neutral'}
              trendValue={`${dashboardStats.activation_codes_stats.recent_activations} recent`}
              href="/dashboard/activation-codes"
              className="hover:border-brand-navy"
            />
          )}
        </div>

        {/* Quota Overview */}
        {quotaStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Quotas"
              value={quotaStats.total_quotas.toLocaleString()}
              subtitle="Across all organizations"
              icon={Database}
            />
            <StatCard
              title="Exceeded Quotas"
              value={quotaStats.exceeded_quotas}
              subtitle="Requiring attention"
              icon={AlertTriangle}
              className={quotaStats.exceeded_quotas > 0 ? 'border-status-error border-2' : ''}
            />
            <StatCard
              title="Near Limit"
              value={quotaStats.near_limit_quotas}
              subtitle=">80% usage"
              icon={TrendingUp}
              className={quotaStats.near_limit_quotas > 0 ? 'border-status-warning border-2' : ''}
            />
            <StatCard
              title="Healthy Quotas"
              value={quotaStats.total_quotas - quotaStats.exceeded_quotas - quotaStats.near_limit_quotas}
              subtitle="<80% usage"
              icon={CheckCircle}
            />
          </div>
        )}

        {/* Billing Overview */}
        {(billingStats || subscriptionStats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {billingStats && (
              <>
                <StatCard
                  title="Billing Accounts"
                  value={billingStats.total_billing_accounts}
                  subtitle={`${billingStats.active_billing_accounts} active`}
                  icon={Building2}
                />
              </>
            )}
            {subscriptionStats && (
              <>
                <StatCard
                  title="Active Subscriptions"
                  value={subscriptionStats.active_subscriptions}
                  subtitle={`${subscriptionStats.total_subscriptions} total`}
                  icon={Activity}
                />
                <StatCard
                  title="Monthly Revenue"
                  value={`$${subscriptionStats.monthly_recurring_revenue.toFixed(0)}`}
                  subtitle="Recurring revenue"
                  icon={BarChart3}
                />
              </>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              title="User Management"
              description="View and manage users"
              icon={Users}
              href="/dashboard/users"
            />
            <QuickActionCard
              title="Organization Management"
              description="Manage tiers and settings"
              icon={Building2}
              href="/dashboard/organizations"
            />
            <QuickActionCard
              title="View Audit Logs"
              description="Review system activity"
              icon={FileText}
              href="/dashboard/audit"
            />
            <QuickActionCard
              title="System Health"
              description="Monitor system status"
              icon={Activity}
              href="/dashboard/system"
            />
            <QuickActionCard
              title="Security Settings"
              description="Configure rate limiting"
              icon={Shield}
              href="/dashboard/security"
            />
            <QuickActionCard
              title="Quota Management"
              description="Monitor and adjust limits"
              icon={Database}
              href="/dashboard/quotas"
            />
            <QuickActionCard
              title="Impersonation History"
              description="Track admin impersonation activities"
              icon={UserCheck}
              href="/dashboard/impersonation-history"
            />
            <QuickActionCard
              title="Role Mappings"
              description="Manage Auth0 role assignments"
              icon={UserCog}
              href="/dashboard/role-mappings"
            />
            <QuickActionCard
              title="Engine Management"
              description="Configure processing engines"
              icon={Server}
              href="/dashboard/engines"
            />
            {user?.role === 'super_admin' && (
              <>
                <QuickActionCard
                  title="Tier Management"
                  description="Manage subscription tiers"
                  icon={Package}
                  href="/dashboard/tiers"
                />
                <QuickActionCard
                  title="Plan Management"
                  description="Manage billing plans"
                  icon={DollarSign}
                  href="/dashboard/plans"
                />
                <QuickActionCard
                  title="Law Packs"
                  description="Manage law pack library"
                  icon={FileText}
                  href="/dashboard/law-packs"
                />
              </>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Activities</h2>
          <div className="card">
            <div className="space-y-4">
              {dashboardStats?.recent_activities && dashboardStats.recent_activities.length > 0 ? (
                <>
                  {dashboardStats.recent_activities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-bg-light-6 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.activity_type === 'warning' ? 'bg-status-warning' :
                          activity.activity_type === 'success' ? 'bg-status-success' :
                          'bg-status-info'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">{activity.action}</p>
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <Clock className="w-3 h-3" />
                            <span>{activity.latest_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          activity.activity_type === 'warning' ? 'bg-orange-100 text-orange-800' :
                          activity.activity_type === 'success' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.count}x
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary">
                    {dashboardStats ? 'No recent activities' : 'Loading recent activities...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

