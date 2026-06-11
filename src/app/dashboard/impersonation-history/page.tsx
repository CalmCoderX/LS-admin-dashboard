'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/common/PageHeader';
import { platformAdminApi } from '@/lib/api';
import type { 
  ImpersonationHistoryEntry,
  ImpersonationHistoryApiResponse,
  ImpersonationStatusApiResponse 
} from '@/types/api';
import {
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Eye,
  Shield,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function ImpersonationHistoryPage() {
  const queryClient = useQueryClient();
  // Pagination states
  const [impersonationHistoryPage, setImpersonationHistoryPage] = useState(0);
  const [impersonationHistoryLimit] = useState(10);

  // Impersonation history query
  const { data: impersonationHistoryResponse, isLoading: impersonationHistoryLoading, isRefetching: isRefetchingHistory } = useQuery<ImpersonationHistoryApiResponse>({
    queryKey: ['impersonation-history', impersonationHistoryPage, impersonationHistoryLimit],
    queryFn: () => platformAdminApi.getImpersonationHistory({
      skip: impersonationHistoryPage * impersonationHistoryLimit,
      limit: impersonationHistoryLimit
    }) as Promise<ImpersonationHistoryApiResponse>,
  });

  // Extract data from nested response structure
  const impersonationHistory = impersonationHistoryResponse?.data?.data?.history;
  const impersonationHistoryTotal = impersonationHistoryResponse?.data?.data?.total_sessions;

  // Impersonation status query
  const { data: impersonationStatusResponse, isLoading: impersonationStatusLoading, isRefetching: isRefetchingStatus } = useQuery<ImpersonationStatusApiResponse>({
    queryKey: ['impersonation-status'],
    queryFn: () => platformAdminApi.getImpersonationStatus() as Promise<ImpersonationStatusApiResponse>,
  });

  // Extract data from nested response structure
  const impersonationStatus = impersonationStatusResponse?.data?.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Impersonation History"
          description="Track and monitor impersonation activities across the platform."
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['impersonation-history'] });
            queryClient.invalidateQueries({ queryKey: ['impersonation-status'] });
          }}
          isRefreshing={isRefetchingHistory || isRefetchingStatus}
        />

        {/* Current Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-text-primary dark:text-gray-100">Current Status</h4>
          </div>

          {impersonationStatusLoading ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
              <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
              <p className="text-text-secondary dark:text-gray-400">Loading impersonation status...</p>
            </div>
          ) : impersonationStatus?.is_impersonating && impersonationStatus.session ? (
            <div className="p-4 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-800 dark:text-orange-200">Active Impersonation</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Currently impersonating: {impersonationStatus.session.impersonated_user_email}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100 rounded-full">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-orange-200 dark:border-orange-700">
                <div>
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Admin</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {impersonationStatus.session.admin_user_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Started At</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {format(new Date(impersonationStatus.session.started_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">User</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {impersonationStatus.session.impersonated_user_email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-status-success" />
              <p className="font-medium text-green-800 dark:text-green-200">No active impersonation sessions</p>
            </div>
          )}
        </div>

        {/* Impersonation History */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-text-primary dark:text-gray-100">History</h4>
          </div>

          {impersonationHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
              <span className="ml-2 text-text-secondary">Loading history...</span>
            </div>
          ) : impersonationHistory && impersonationHistory.length > 0 ? (
            <div className="space-y-3">
              {impersonationHistory.map((entry: ImpersonationHistoryEntry) => {
                const getActionDetails = (action: string) => {
                  if (action.includes('START_IMPERSONATION')) {
                    return { type: 'start', icon: UserCheck, color: 'green', label: 'Started Session' };
                  } else if (action.includes('END_IMPERSONATION')) {
                    return { type: 'end', icon: UserX, color: 'red', label: 'Ended Session' };
                  } else if (action.includes('WRITE_BLOCKED')) {
                    return { type: 'blocked', icon: Shield, color: 'yellow', label: 'Write Blocked' };
                  } else if (action.includes('Session Summary')) {
                    return { type: 'summary', icon: Eye, color: 'blue', label: 'Session Summary' };
                  } else if (action.includes('IMPERSONATION_ACCESS')) {
                    return { type: 'access', icon: Eye, color: 'gray', label: 'Access Event' };
                  } else {
                    return { type: 'other', icon: Users, color: 'gray', label: 'Other Action' };
                  }
                };

                const actionDetails = getActionDetails(entry.action);
                const IconComponent = actionDetails.icon;

                return (
                  <div
                    key={entry.id}
                    className={clsx(
                      'p-4 rounded-lg border',
                      actionDetails.color === 'green' && 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700',
                      actionDetails.color === 'red' && 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700',
                      actionDetails.color === 'yellow' && 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
                      actionDetails.color === 'blue' && 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700',
                      actionDetails.color === 'gray' && 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className={clsx(
                        'w-5 h-5 mt-0.5',
                        actionDetails.color === 'green' && 'text-green-600 dark:text-green-400',
                        actionDetails.color === 'red' && 'text-red-600 dark:text-red-400',
                        actionDetails.color === 'yellow' && 'text-yellow-600 dark:text-yellow-400',
                        actionDetails.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                        actionDetails.color === 'gray' && 'text-gray-600 dark:text-gray-400'
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className={clsx(
                            'font-medium',
                            actionDetails.color === 'green' && 'text-green-800 dark:text-green-200',
                            actionDetails.color === 'red' && 'text-red-800 dark:text-red-200',
                            actionDetails.color === 'yellow' && 'text-yellow-800 dark:text-yellow-200',
                            actionDetails.color === 'blue' && 'text-blue-800 dark:text-blue-200',
                            actionDetails.color === 'gray' && 'text-gray-800 dark:text-gray-200'
                          )}>
                            {actionDetails.label}
                          </h5>
                          <span className="text-xs text-text-tertiary dark:text-gray-400">
                            Session: {entry.session_id.substring(0, 8)}...
                          </span>
                        </div>

                        {/* Action details */}
                        <p className={clsx(
                          'text-sm mb-3',
                          actionDetails.color === 'green' && 'text-green-700 dark:text-green-300',
                          actionDetails.color === 'red' && 'text-red-700 dark:text-red-300',
                          actionDetails.color === 'yellow' && 'text-yellow-700 dark:text-yellow-300',
                          actionDetails.color === 'blue' && 'text-blue-700 dark:text-blue-300',
                          actionDetails.color === 'gray' && 'text-gray-700 dark:text-gray-300'
                        )}>
                          {entry.action}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className={clsx(
                              'font-medium mb-1',
                              actionDetails.color === 'green' && 'text-green-800 dark:text-green-200',
                              actionDetails.color === 'red' && 'text-red-800 dark:text-red-200',
                              actionDetails.color === 'yellow' && 'text-yellow-800 dark:text-yellow-200',
                              actionDetails.color === 'blue' && 'text-blue-800 dark:text-blue-200',
                              actionDetails.color === 'gray' && 'text-gray-800 dark:text-gray-200'
                            )}>
                              Admin
                            </p>
                            <p className={clsx(
                              actionDetails.color === 'green' && 'text-green-700 dark:text-green-300',
                              actionDetails.color === 'red' && 'text-red-700 dark:text-red-300',
                              actionDetails.color === 'yellow' && 'text-yellow-700 dark:text-yellow-300',
                              actionDetails.color === 'blue' && 'text-blue-700 dark:text-blue-300',
                              actionDetails.color === 'gray' && 'text-gray-700 dark:text-gray-300'
                            )}>
                              {entry.admin_user_email}
                            </p>
                          </div>
                          <div>
                            <p className={clsx(
                              'font-medium mb-1',
                              actionDetails.color === 'green' && 'text-green-800 dark:text-green-200',
                              actionDetails.color === 'red' && 'text-red-800 dark:text-red-200',
                              actionDetails.color === 'yellow' && 'text-yellow-800 dark:text-yellow-200',
                              actionDetails.color === 'blue' && 'text-blue-800 dark:text-blue-200',
                              actionDetails.color === 'gray' && 'text-gray-800 dark:text-gray-200'
                            )}>
                              Impersonated User
                            </p>
                            <p className={clsx(
                              actionDetails.color === 'green' && 'text-green-700 dark:text-green-300',
                              actionDetails.color === 'red' && 'text-red-700 dark:text-red-300',
                              actionDetails.color === 'yellow' && 'text-yellow-700 dark:text-yellow-300',
                              actionDetails.color === 'blue' && 'text-blue-700 dark:text-blue-300',
                              actionDetails.color === 'gray' && 'text-gray-700 dark:text-gray-300'
                            )}>
                              {entry.impersonated_user_email}
                            </p>
                          </div>
                          <div>
                            <p className={clsx(
                              'font-medium mb-1',
                              actionDetails.color === 'green' && 'text-green-800 dark:text-green-200',
                              actionDetails.color === 'red' && 'text-red-800 dark:text-red-200',
                              actionDetails.color === 'yellow' && 'text-yellow-800 dark:text-yellow-200',
                              actionDetails.color === 'blue' && 'text-blue-800 dark:text-blue-200',
                              actionDetails.color === 'gray' && 'text-gray-800 dark:text-gray-200'
                            )}>
                              Timestamp
                            </p>
                            <p className={clsx(
                              actionDetails.color === 'green' && 'text-green-700 dark:text-green-300',
                              actionDetails.color === 'red' && 'text-red-700 dark:text-red-300',
                              actionDetails.color === 'yellow' && 'text-yellow-700 dark:text-yellow-300',
                              actionDetails.color === 'blue' && 'text-blue-700 dark:text-blue-300',
                              actionDetails.color === 'gray' && 'text-gray-700 dark:text-gray-300'
                            )}>
                              {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {(impersonationHistoryTotal ?? 0) > impersonationHistoryLimit && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-text-secondary">
                    Showing {impersonationHistoryPage * impersonationHistoryLimit + 1} to {Math.min((impersonationHistoryPage + 1) * impersonationHistoryLimit, impersonationHistoryTotal ?? 0)} of {impersonationHistoryTotal ?? 0} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImpersonationHistoryPage(Math.max(0, impersonationHistoryPage - 1))}
                      disabled={impersonationHistoryPage === 0}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setImpersonationHistoryPage(impersonationHistoryPage + 1)}
                      disabled={(impersonationHistoryPage + 1) * impersonationHistoryLimit >= (impersonationHistoryTotal ?? 0)}
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
              <Users className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
              <p className="text-text-secondary">No impersonation history found</p>
              <p className="text-sm text-text-tertiary mt-1">
                Impersonation activities will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
