'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { superAdminApi } from '@/lib/api';
import { TierAdmin } from '@/types/api';
import {
  Plus,
  Search,
  Edit,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { TierDialog } from './components/TierDialog';
import { TierViewDialog } from './components/TierViewDialog';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

interface TierFilters {
  search: string;
}

interface TierListResponse {
  tiers: TierAdmin[];
  total: number;
}

export default function TiersPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TierFilters>({
    search: '',
  });
  const [selectedTier, setSelectedTier] = useState<TierAdmin | null>(null);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'view' | null>(null);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fetch all tiers with filters (no pagination needed)
  const { data: tiersData, isLoading: isLoadingTiers, error, isRefetching: isRefetchingTiers } = useQuery({
    queryKey: ['tiers-admin', debouncedSearch],
    queryFn: async () => {
      return superAdminApi.getTiersAdmin({
        search: debouncedSearch || undefined,
      });
    },
    staleTime: 30000, // Cache for 30 seconds since data doesn't change frequently
  });



  const handleFilterChange = (key: keyof TierFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };



  const handleCreate = () => {
    setSelectedTier(null);
    setDialogType('create');
  };

  const handleEdit = (tier: TierAdmin) => {
    setSelectedTier(tier);
    setDialogType('edit');
  };

  const handleView = (tier: TierAdmin) => {
    setSelectedTier(tier);
    setDialogType('view');
  };

  const handleCloseDialog = () => {
    setSelectedTier(null);
    setDialogType(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tiers-admin'] });
    handleCloseDialog();
  };

  const tiers = (tiersData as TierListResponse)?.tiers || [];
  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load tiers</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Tier Management
            </h1>
            <p className="text-text-secondary mt-1">
              Manage subscription tiers and their limits
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['tiers-admin'] })}
              className="btn-secondary flex items-center gap-2"
              disabled={isRefetchingTiers}
            >
              <RefreshCw className={clsx('w-4 h-4', isRefetchingTiers && 'animate-spin')} />
              {isRefetchingTiers ? 'Refreshing...' : 'Refresh'}
            </button>
            <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Tier
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Tiers</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tiers..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10 pr-10 w-64"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-medium-2 animate-spin" />
              )}
            </div>
          </div>

          {isLoadingTiers ? (
            <TableSkeleton rows={10} columns={7} />
          ) : tiers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {filters.search ? 'No tiers found matching your search.' : 'No tiers found.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Slug</th>
                      <th className="px-6 py-3 text-left">Max Users</th>
                      <th className="px-6 py-3 text-left">API Calls</th>
                      <th className="px-6 py-3 text-left">Plans</th>
                      <th className="px-6 py-3 text-left">Order</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier: TierAdmin) => (
                      <tr key={tier.id} className="table-row">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-text-primary">{tier.name}</div>
                            {tier.description && (
                              <div className="text-sm text-text-secondary truncate max-w-xs">
                                {tier.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                            {tier.slug}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-text-primary">{tier.max_users}</td>
                        <td className="px-6 py-4 text-text-primary">{tier.api_calls_limit.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary">{tier.plan_count || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-primary">{tier.sort_order}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(tier)}
                              className="text-text-secondary hover:text-text-primary p-1"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(tier)}
                              className="text-text-secondary hover:text-text-primary p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
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
        {dialogType === 'view' && selectedTier && (
          <TierViewDialog
            tier={selectedTier}
            isOpen={true}
            onClose={handleCloseDialog}
          />
        )}

        {(dialogType === 'create' || dialogType === 'edit') && (
          <TierDialog
            tier={selectedTier}
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
            mode={dialogType}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
