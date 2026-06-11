'use client';

import { getEngineStatusColor } from '@/constants/badges';
import Modal from '@/components/ui/Modal';
import { Activity, CheckCircle, AlertCircle, Clock, Server, Zap } from 'lucide-react';
import clsx from 'clsx';
import { Engine } from '@/types/api';

interface EngineViewDialogProps {
  engine: Engine;
  isOpen: boolean;
  onClose: () => void;
}

export function EngineViewDialog({ engine, isOpen, onClose }: EngineViewDialogProps) {
  const getStatusIcon = (status: string, healthStatus?: string) => {
    if (status !== 'active') {
      return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }

    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getLawPackStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'deprecated':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Engine Details" size='lg'>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-brand-navy/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
              <Server className="w-5 h-5 text-brand-navy dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary">{engine.name}</h3>
            <p className="text-sm text-text-secondary">
              Processing engine configuration and status
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-bg-light-2 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(engine.status, engine.health_status)}
              <div>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getEngineStatusColor(engine.status, engine.health_status)
                )}>
                  {engine.health_status === 'healthy' ? 'Healthy' :
                   engine.health_status === 'unhealthy' ? 'Unhealthy' :
                   engine.status.charAt(0).toUpperCase() + engine.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-text-secondary">
              Last check: {engine.last_health_check
                ? new Date(engine.last_health_check).toLocaleString()
                : 'Never'
              }
            </div>
          </div>
        </div>

        {/* Engine Details */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Queue URL
          </label>
          <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
            <span className="font-mono text-sm text-text-primary">
              {engine.queue_url}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            ECS Service Name
          </label>
          <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
            <span className="font-mono text-sm text-text-primary">
              {engine.service_name}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {engine.version && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Engine Version
              </label>
              <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
                <span className="text-sm text-text-primary">
                  {engine.version}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Law Packs
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-text-primary">
                  {engine.supported_law_pack_count} assigned
                </span>
              </div>
            </div>
          </div>

          {engine.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
                <p className="text-sm text-text-primary">
                  {engine.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div>
          <h4 className="text-md font-medium text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-light-2 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-text-primary">
                {engine.total_requests?.toLocaleString() ?? 'N/A'}
              </div>
              <div className="text-sm text-text-secondary">Total Requests</div>
            </div>

            <div className="bg-bg-light-2 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {engine.success_rate !== null && engine.success_rate !== undefined
                  ? `${(engine.success_rate * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-text-secondary">Success Rate</div>
            </div>

            <div className="bg-bg-light-2 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {engine.average_response_time
                  ? `${engine.average_response_time}ms`
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-text-secondary">Avg Response Time</div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div>
          <h4 className="text-md font-medium text-text-primary mb-4">Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Created
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <p className="text-sm text-text-primary">
                {engine.created_at ? new Date(engine.created_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Last Updated
            </label>
            <div className="px-3 py-2 bg-bg-light-2 dark:bg-gray-800 border border-bg-light-6 dark:border-gray-700 rounded-md">
              <p className="text-sm text-text-primary">
                {engine.updated_at ? new Date(engine.updated_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Law Packs Details */}
        {engine.supported_law_packs && engine.supported_law_packs.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-text-primary mb-4">Assigned Law Packs</h4>
            <div className="max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {engine.supported_law_packs.map((lawPack, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-bg-light-2 dark:bg-gray-800 rounded-md">
                    <div className="flex flex-col">
                      <span className="text-sm text-text-primary">{lawPack.law_pack_name || lawPack.name}</span>
                      {lawPack.version && (
                        <span className="text-xs text-text-secondary">Version: {lawPack.version}</span>
                      )}
                    </div>
                    <span className={clsx(
                      "px-2 py-1 text-xs rounded-full capitalize",
                      getLawPackStatusColor(lawPack.law_pack_status)
                    )}>
                      {lawPack.law_pack_status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
