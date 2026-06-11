'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { superAdminApi } from '@/lib/api';
import { Auth0Settings, Auth0ConnectionStatus, MFAStatus, MFAFactor } from '@/types/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const handleMfaToggle = (factorName: string, currentEnabled: boolean) => {
    updateMfaFactorMutation.mutate({
      factor_name: factorName,
      enabled: !currentEnabled,
    });
  };

  // Auth0 settings query
  const {
    data: auth0Settings,
    isLoading: auth0Loading,
    isFetching: auth0Fetching,
    isRefetching: auth0Refetching,
    error: auth0Error,
    refetch: refetchAuth0Status
  } = useQuery<Auth0Settings>({
    queryKey: ['auth0-settings'],
    queryFn: () => superAdminApi.getAuth0Status(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // MFA factor update mutation
  const updateMfaFactorMutation = useMutation({
    mutationFn: ({ factor_name, enabled }: { factor_name: string; enabled: boolean }) =>
      superAdminApi.updateMfaFactor({ factor_name, enabled }),
    onSuccess: (data: { message: string; enabled: boolean }) => {
      toast.success(`MFA factor ${data.enabled ? 'enabled' : 'disabled'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['auth0-settings'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update MFA factor'));
    },
  });



  const renderAuth0Section = () => {
    if (auth0Loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (auth0Error || !auth0Settings) {
      return (
        <div className="card bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 border">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">Failed to load Auth0 settings</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {auth0Error ? getErrorMessage(auth0Error, 'Failed to load Auth0 settings') : 'Unknown error occurred'}
              </p>
              <button
                onClick={() => refetchAuth0Status()}
                className="btn-secondary mt-2 text-sm flex"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    const { connection_status, mfa_status } = auth0Settings || {};
    const isConnected = connection_status?.status === 'connected';

    return (
    <div className="space-y-6">
        {/* Connection Status */}
      <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100">
              Auth0 Connection Status
            </h3>
            <button
              onClick={() => refetchAuth0Status()}
              className="flex btn-secondary text-sm"
              disabled={auth0Refetching}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${auth0Refetching ? 'animate-spin' : ''}`} />
              {auth0Refetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className={`card border ${
            isConnected
              ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
          }`}>
            <div className="flex items-start gap-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${
                    isConnected
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {connection_status?.tenant_name || connection_status?.domain || 'Unknown'}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isConnected
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                    {connection_status?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    {connection_status?.domain_reachable ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">Domain Reachable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {connection_status?.jwks_accessible ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">JWKS Accessible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {connection_status?.management_api_accessible ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">Management API</span>
                  </div>
                </div>

                {connection_status?.error && (
                  <p className={`text-sm mt-2 ${
                    isConnected
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    Error: {connection_status.error}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Last checked: {connection_status?.last_checked ? new Date(connection_status.last_checked).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MFA Configuration */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-4">
            Multi-Factor Authentication
          </h3>

          {mfa_status?.status === 'error' ? (
            <div className="card bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 border">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Failed to load MFA settings
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {mfa_status?.error || 'Unknown error occurred'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MFA Status Overview */}
              <div className={`card border ${
                mfa_status.mfa_enabled
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                  : 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700'
              }`}>
                <div className="flex items-start gap-3">
                  <Shield className={`w-5 h-5 mt-0.5 ${
                    mfa_status?.mfa_enabled
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`} />
                  <div>
                    <h4 className={`font-medium ${
                      mfa_status?.mfa_enabled
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-orange-800 dark:text-orange-200'
                    }`}>
                      MFA Status: {mfa_status?.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      mfa_status?.mfa_enabled
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {mfa_status?.mfa_enabled
                        ? `${mfa_status?.enabled_factors?.length || 0} MFA factor(s) active`
                        : 'No MFA factors are currently enabled'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* MFA Factors */}
              {mfa_status?.available_factors && mfa_status.available_factors.length > 0 && (
                <div className="card">
                  <h4 className="font-semibold text-text-primary dark:text-gray-100 mb-4">
                    Available MFA Factors
                  </h4>
                  <div className="space-y-3">
                    {mfa_status.available_factors.map((factor: any) => (
                      <div key={factor.name} className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            factor.enabled ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <div>
                            <span className="font-medium text-text-primary dark:text-gray-200">
                              {factor.name.charAt(0).toUpperCase() + factor.name.slice(1).replace(/-/g, ' ')}
                            </span>
                            {factor.trial_expired && (
                              <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Trial Expired
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMfaToggle(factor.name, factor.enabled)}
                          disabled={updateMfaFactorMutation.isPending || auth0Loading || auth0Fetching || factor.trial_expired}
                          className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                            factor.enabled
                              ? 'text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900'
                              : 'text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updateMfaFactorMutation.isPending || auth0Fetching ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : factor.enabled ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          {updateMfaFactorMutation.isPending || auth0Fetching
                            ? 'Updating...'
                            : factor.enabled ? 'Disable' : 'Enable'
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Last updated: {mfa_status?.last_checked ? new Date(mfa_status.last_checked).toLocaleString() : 'Never'}
              </p>
            </div>
          )}
      </div>
    </div>
  );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100">Auth0 Settings</h1>
            <p className="text-text-secondary dark:text-gray-300">
              Manage Auth0 identity provider integration and multi-factor authentication
            </p>
          </div>
        </div>

        {/* Auth0 Settings Content */}
        <div className="card">
          {renderAuth0Section()}
        </div>
      </div>
    </DashboardLayout>
  );
}
