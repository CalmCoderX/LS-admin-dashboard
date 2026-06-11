'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Activity,
  Package,
} from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/common/PageHeader';
import { HealthStatusBadge } from '@/components/common/StatusBadge';
import { EngineViewDialog } from './components/EngineViewDialog';
import { EngineEditDialog } from './components/EngineEditDialog';
import { EngineCreateDialog } from './components/EngineCreateDialog';
import { EngineDistributeDialog } from './components/EngineDistributeDialog';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/error';
import { Engine } from '@/types/api';

interface EngineFilters {
  search: string;
  status?: string;
}

interface EngineListResponse {
  engines: Engine[];
}

export default function EnginesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EngineFilters>({
    search: '',
  });
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'view' | 'distribute' | null>(null);
  const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fetch engines
  const { data: enginesData, isLoading: isLoadingEngines, error, isRefetching: isRefetchingEngines } = useQuery({
    queryKey: ['engines-admin', debouncedSearch, filters.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.status) params.append('status', filters.status);

      return platformAdminApi.getEngines(params.toString());
    },
    refetchOnWindowFocus: false
  });

  const handleCreate = () => {
    setSelectedEngine(null);
    setDialogType('create');
  };

  const handleEdit = (engine: Engine) => {
    setSelectedEngine(engine);
    setDialogType('edit');
  };

  const handleView = (engine: Engine) => {
    setSelectedEngine(engine);
    setDialogType('view');
  };

  const handleDistribute = (engine: Engine) => {
    setSelectedEngine(engine);
    setDialogType('distribute');
  };

  const handleCloseDialog = () => {
    setSelectedEngine(null);
    setDialogType(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['engines-admin'] });
    handleCloseDialog();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['engines-admin'] });
  };

  const handleHealthCheck = async () => {
    setIsHealthCheckLoading(true);
    try {
      await platformAdminApi.checkAllEnginesHealth();
      await queryClient.invalidateQueries({ queryKey: ['engines-admin'] });
      toast.success('Health check completed');
    } catch (error) {
      toast.error(getErrorMessage(error as Parameters<typeof getErrorMessage>[0], 'Health check failed'));
    } finally {
      setIsHealthCheckLoading(false);
    }
  };

  const engines = (enginesData as { engines: Engine[] })?.engines || [];

  // Filter engines based on search
  const filteredEngines = engines.filter((engine: Engine) =>
    !debouncedSearch ||
    engine.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    engine.queue_url.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    engine.service_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    engine.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load engines</p>
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
          title="Engine Management"
          description="Manage processing engines and law pack assignments"
          actions={[
            {
              id: 'add-engine',
              label: 'Add Engine',
              icon: Plus,
              onClick: handleCreate,
              variant: 'primary'
            }
          ]}
          onRefresh={handleRefresh}
          isRefreshing={isRefetchingEngines}
          showHealthCheck
          onHealthCheck={handleHealthCheck}
          isHealthCheckLoading={isHealthCheckLoading}
        />

        {/* Search and Filters */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Engines</h2>
            <div className="flex items-center gap-4">
              {/* Status Filter */}
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="input-field w-40"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="error">Error</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search engines..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 input-field w-64"
                />
              </div>
            </div>
          </div>

          {isLoadingEngines ? (
            <TableSkeleton rows={5} columns={8} />
          ) : filteredEngines.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {filters.search || filters.status ? 'No engines found matching your criteria.' : 'No engines found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Queue URL</th>
                    <th className="px-6 py-3 text-left">Service Name</th>
                    <th className="px-6 py-3 text-left">Law Packs</th>
                    <th className="px-6 py-3 text-left">Performance</th>
                    <th className="px-6 py-3 text-left">Last Check</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEngines.map((engine: Engine) => (
                    <tr key={engine.id} className={clsx(
                      'table-row',
                      engine.status !== 'active' && 'opacity-60 bg-gray-50 dark:bg-gray-900/50'
                    )}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-text-primary">
                            {engine.name}
                          </div>
                          {engine.version && (
                            <div className="text-sm text-text-secondary">
                              v{engine.version}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <HealthStatusBadge
                          health={engine.health_status}
                          isActive={engine.status === 'active'}
                        />
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-text-primary">
                          {engine.queue_url}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-text-primary">
                          {engine.service_name}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-text-primary">
                            {engine.supported_law_pack_count}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {engine.success_rate !== null && engine.success_rate !== undefined ? (
                            <div>
                              <div className="text-text-primary">
                                {(engine.success_rate * 100).toFixed(1)}% success
                              </div>
                              {engine.average_response_time && (
                                <div className="text-text-secondary">
                                  {engine.average_response_time}ms avg
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-secondary">No data</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">
                          {engine.last_health_check
                            ? new Date(engine.last_health_check).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(engine)}
                            className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                            title="View engine"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(engine)}
                            className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                            title="Edit engine"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDistribute(engine)}
                            className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                            title="Assign Law Packs"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dialogs */}
        {dialogType === 'view' && selectedEngine && (
          <EngineViewDialog
            engine={selectedEngine}
            isOpen={true}
            onClose={handleCloseDialog}
          />
        )}

        {dialogType === 'edit' && selectedEngine && (
          <EngineEditDialog
            engine={selectedEngine}
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
          />
        )}

        {dialogType === 'create' && (
          <EngineCreateDialog
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
          />
        )}

        {dialogType === 'distribute' && selectedEngine && (
          <EngineDistributeDialog
            engine={selectedEngine}
            isOpen={true}
            onClose={handleCloseDialog}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
