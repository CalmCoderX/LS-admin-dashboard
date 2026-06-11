'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { superAdminApi } from '@/lib/api';
import { PlanWithTierResponse, TierAdmin, PlanStripeSyncResponse } from '@/types/api';

type PlanAdmin = PlanWithTierResponse;
import {
  Plus,
  Search,
  Edit,
  Eye,
  DollarSign,
  Package,
  Filter,
  Loader2,
  Ban,
  CheckCircle,
  Link2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { PlanDialog } from './components/PlanDialog';
import { PlanViewDialog } from './components/PlanViewDialog';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface PlanFilters {
  search: string;
  tier_id: string;
  is_active: string;
}

interface PlanListResponse {
  plans: PlanWithTierResponse[];
  total: number;
}

interface TierListResponse {
  tiers: TierAdmin[];
  total: number;
}

export default function PlansPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PlanFilters>({
    search: '',
    tier_id: '',
    is_active: '',
  });
  const [selectedPlan, setSelectedPlan] = useState<PlanAdmin | null>(null);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'view' | null>(null);
  const [syncResults, setSyncResults] = useState<PlanStripeSyncResponse | null>(null);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fetch all plans with filters (no pagination needed)
  const { data: plansData, isLoading: isLoadingPlans, error, isRefetching: isRefetchingPlans } = useQuery({
    queryKey: ['plans-admin', debouncedSearch, filters.tier_id, filters.is_active],
    queryFn: async () => {
      return superAdminApi.getPlansAdmin({
        search: debouncedSearch || undefined,
        tier_id: filters.tier_id ? parseInt(filters.tier_id) : undefined,
        is_active: filters.is_active === 'true' ? true : filters.is_active === 'false' ? false : undefined,
        include_tier: true,
      });
    },
    staleTime: 30000, // Cache for 30 seconds since data doesn't change frequently
  });

  // Fetch tiers for filter dropdown
  const { data: tiersData } = useQuery({
    queryKey: ['tiers-admin-basic'],
    queryFn: async () => {
      return superAdminApi.getTiersAdmin({});
    },
    staleTime: 60000, // Cache tiers for 1 minute since they change infrequently
  });

  const activateMutation = useMutation({
    mutationFn: (planId: number) => superAdminApi.activatePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
      toast.success('Plan activated successfully');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to activate plan'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (planId: number) => superAdminApi.deactivatePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
      toast.success('Plan deactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to deactivate plan'));
    },
  });

  const syncPlansMutation = useMutation({
    mutationFn: () => superAdminApi.syncPlansWithStripe(),
    onSuccess: (result) => {
      setSyncResults(result as PlanStripeSyncResponse);
      queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
      const data = result as PlanStripeSyncResponse;
      toast.success(
        `Sync complete: ${data.updated_count} updated, ${data.deactivated_count} deactivated, ${data.error_count} errors`
      );
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to sync plans with Stripe'));
    },
  });

  const handleFilterChange = (key: keyof PlanFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleStatus = async (plan: PlanAdmin) => {
    if (plan.is_active) {
      deactivateMutation.mutate(plan.id);
    } else {
      activateMutation.mutate(plan.id);
    }
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setDialogType('create');
  };

  const handleEdit = (plan: PlanAdmin) => {
    setSelectedPlan(plan);
    setDialogType('edit');
  };

  const handleView = (plan: PlanAdmin) => {
    setSelectedPlan(plan);
    setDialogType('view');
  };

  const handleCloseDialog = () => {
    setSelectedPlan(null);
    setDialogType(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
    handleCloseDialog();
  };

  const plans = (plansData as PlanListResponse)?.plans || [];
  const tiers = (tiersData as TierListResponse)?.tiers || [];
  const totalPlans = plans.length;

  // Detect if search is being typed (not yet debounced)
  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load plans</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
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
          title="Plan Management"
          description="Manage billing plans and their pricing"
          actions={[
            {
              id: 'sync-stripe',
              label: 'Sync Stripe Data',
              icon: Link2,
              onClick: () => setShowSyncConfirmation(true),
              variant: 'secondary',
              loading: syncPlansMutation.isPending,
            },
            {
              id: 'create-plan',
              label: 'Create Plan',
              icon: Plus,
              onClick: handleCreate,
              variant: 'primary'
            }
          ]}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['plans-admin'] })}
          isRefreshing={isRefetchingPlans}
        />

        {syncResults && (
          <div className="card border border-bg-light-6 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">Stripe Sync Results</h3>
              <button
                type="button"
                className="text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setSyncResults(null)}
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
              <div><span className="text-text-secondary">Total:</span> <span className="font-medium">{syncResults.total_plans}</span></div>
              <div><span className="text-text-secondary">Updated:</span> <span className="font-medium text-status-success">{syncResults.updated_count}</span></div>
              <div><span className="text-text-secondary">Deactivated:</span> <span className="font-medium text-status-warning">{syncResults.deactivated_count}</span></div>
              <div><span className="text-text-secondary">Unchanged:</span> <span className="font-medium">{syncResults.unchanged_count}</span></div>
              <div><span className="text-text-secondary">Errors:</span> <span className="font-medium text-status-error">{syncResults.error_count}</span></div>
            </div>

            {(syncResults.deactivated.length > 0 || syncResults.errors.length > 0) && (
              <div className="space-y-3">
                {syncResults.deactivated.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-1">Deactivated Plans</h4>
                    <div className="text-xs text-text-secondary space-y-1">
                      {syncResults.deactivated.map((item) => (
                        <p key={`deactivated-${item.plan_id}`}>
                          #{item.plan_id} {item.plan_name} - {item.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {syncResults.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-1">Errors</h4>
                    <div className="text-xs text-status-error space-y-1">
                      {syncResults.errors.map((item) => (
                        <p key={`error-${item.plan_id}`}>
                          #{item.plan_id} {item.plan_name} - {item.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingPlans}
          columns={3}
          stats={[
            {
              id: 'total',
              title: 'Total Plans',
              value: totalPlans,
              icon: Package,
              iconColor: 'text-text-secondary'
            },
            {
              id: 'active',
              title: 'Active Plans',
              value: plans.filter((p: PlanAdmin) => p.is_active).length,
              icon: Package,
              iconColor: 'text-green-600'
            },
            {
              id: 'featured',
              title: 'Featured Plans',
              value: plans.filter((p: PlanAdmin) => p.is_featured).length,
              icon: Package,
              iconColor: 'text-yellow-600'
            }
          ]}
        />

        {/* Search and Filters */}
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-text-primary lg:mr-auto">Plans</h2>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filters.tier_id}
                  onChange={(e) => handleFilterChange('tier_id', e.target.value)}
                  className="input-field w-40"
                >
                  <option value="">All Tiers</option>
                  {tiers.map((tier: TierAdmin) => (
                    <option key={tier.id} value={tier.id.toString()}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className="input-field w-32"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input-field pl-10 pr-10 w-64"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-medium-2 animate-spin" />
                )}
              </div>
            </div>
          </div>

          {isLoadingPlans ? (
            <TableSkeleton rows={10} columns={7} />
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {filters.search || filters.tier_id || filters.is_active
                ? 'No plans found matching your filters.'
                : 'No plans found.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-6 py-3 text-left">Plan Name</th>
                      <th className="px-6 py-3 text-left">Tier</th>
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Featured</th>
                      <th className="px-6 py-3 text-left">Stripe IDs</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan: PlanAdmin) => (
                      <tr key={plan.id} className="table-row">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-text-primary">{plan.name}</div>
                            {plan.description && (
                              <div className="text-sm text-text-secondary truncate max-w-xs">
                                {plan.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {plan.tier ? (
                            <span className="badge-secondary text-nowrap">
                              {plan.tier.name}
                            </span>
                          ) : (
                            <span className="text-text-secondary">No tier</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-text-primary">
                                {plan.amount} USD
                              </span>
                            </div>
                            {plan.amount_brl != null && (
                              <div className="text-xs text-text-secondary text-right">
                                {plan.amount_brl} BRL
                                {plan.interval_brl ? ` / ${plan.interval_count_brl && plan.interval_count_brl > 1 ? `${plan.interval_count_brl} ` : ''}${plan.interval_brl}${plan.interval_count_brl && plan.interval_count_brl > 1 ? 's' : ''}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {plan.is_active ? (
                            <span className="badge-success">Active</span>
                          ) : (
                            <span className="badge-secondary">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {plan.is_featured ? (
                            <span className="badge-warning">⭐</span>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="text-text-secondary">Product:</span>
                              <code className="ml-1 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {plan.stripe_product_id.replace('prod_', '').substring(0, 10)}...
                              </code>
                            </div>
                            <div className="text-xs">
                              <span className="text-text-secondary">USD :</span>
                              <code className="ml-1 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {plan.stripe_price_id.replace('price_', '').substring(0, 10)}...
                              </code>
                            </div>
                            <div className="text-xs">
                              <span className="text-text-secondary">BR Product:</span>
                              <code className="ml-1 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {plan.stripe_product_id_brl
                                  ? `${plan.stripe_product_id_brl.replace('prod_', '').substring(0, 10)}...`
                                  : '—'
                                }
                              </code>
                            </div>
                            <div className="text-xs">
                              <span className="text-text-secondary">BRL :</span>
                              <code className="ml-1 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {plan.stripe_price_id_brl
                                  ? `${plan.stripe_price_id_brl.replace('price_', '').substring(0, 10)}...`
                                  : '—'
                                }
                              </code>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(plan)}
                              className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                              title="View plan"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(plan)}
                              className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                              title="Edit plan"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {plan.is_active ? (
                              <button
                                onClick={() => handleToggleStatus(plan)}
                                disabled={activateMutation.isPending || deactivateMutation.isPending}
                                className="p-1 text-status-warning hover:text-status-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Deactivate plan"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(plan)}
                                disabled={activateMutation.isPending || deactivateMutation.isPending}
                                className="p-1 text-status-success hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Activate plan"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Dialogs */}
        {dialogType === 'view' && selectedPlan && (
          <PlanViewDialog
            plan={selectedPlan}
            isOpen={true}
            onClose={handleCloseDialog}
          />
        )}

        {(dialogType === 'create' || dialogType === 'edit') && (
          <PlanDialog
            plan={selectedPlan}
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
            mode={dialogType}
            tiers={tiers}
          />
        )}

        <ConfirmationModal
          isOpen={showSyncConfirmation}
          onClose={() => setShowSyncConfirmation(false)}
          onConfirm={() => {
            setShowSyncConfirmation(false);
            syncPlansMutation.mutate();
          }}
          title="Sync plans with Stripe?"
          description="This will fetch latest plan metadata from Stripe for all plans and deactivate any plan with an invalid Stripe product ID."
          type="warning"
          confirmLabel="Run Sync"
          cancelLabel="Cancel"
          isLoading={syncPlansMutation.isPending}
          consequences={[
            'Plan name, description, amount, and interval may be updated',
            'Plans with invalid Stripe product IDs will be set to inactive',
            'A sync results summary will be shown after completion'
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
