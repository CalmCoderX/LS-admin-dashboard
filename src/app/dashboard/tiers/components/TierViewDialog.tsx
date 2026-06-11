'use client';

import { X, Settings, Users, FileText, Zap, Clock, Crown, Package } from 'lucide-react';
import { TierAdmin, PlanAdmin } from '@/types/api';
import Modal from '@/components/ui/Modal';

interface TierViewDialogProps {
  tier: TierAdmin & { plans?: PlanAdmin[] };
  isOpen: boolean;
  onClose: () => void;
}

export function TierViewDialog({ tier, isOpen, onClose }: TierViewDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text-primary">{tier.name}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
              Active
            </span>
            {tier.custom_branding && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                <Crown className="h-3 w-3 mr-1" />
                Custom Branding
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-medium">Basic Information</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{tier.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</label>
                  <p className="text-base">
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {tier.slug}
                    </code>
                  </p>
                </div>
              </div>

              {tier.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{tier.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sort Order</label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{tier.sort_order}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-base text-gray-900 dark:text-gray-100">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Limits and Quotas */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5" />
              <h3 className="text-lg font-medium">Limits & Quotas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Max Users</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tier.max_users.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Max Laws</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {tier.max_laws === '-1' ? 'Unlimited' : tier.max_laws}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">API Calls</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tier.api_calls_limit.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <FileText className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reports</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tier.reports_limit.toLocaleString()}</p>
                </div>
              </div>


              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                  <FileText className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Words per Submission</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tier.word_limit_per_submission.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5" />
              <h3 className="text-lg font-medium">Features & Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Custom Branding</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-2 w-2 rounded-full ${tier.custom_branding ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-base text-gray-900 dark:text-gray-100">{tier.custom_branding ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Law Change Cooldown</label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-base text-gray-900 dark:text-gray-100">
                    {tier.law_change_cooldown_days === -1 ? 'No restrictions' :
                     tier.law_change_cooldown_days === 0 ? 'Changes disabled' :
                     tier.law_change_cooldown_days === null || tier.law_change_cooldown_days === undefined ? 'Not set' :
                     `${tier.law_change_cooldown_days} days`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Associated Plans */}
          {tier.plans && tier.plans.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-medium">Associated Plans ({tier.plans.length})</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Billing plans available for this tier
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Plan Name</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Price</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Interval</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Featured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier.plans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="py-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</div>
                            {plan.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="space-y-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              ${plan.amount} USD
                            </span>
                            {plan.amount_brl != null && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                R$ {plan.amount_brl} BRL
                                {plan.interval_brl ? ` / ${plan.interval_count_brl && plan.interval_count_brl > 1 ? `${plan.interval_count_brl} ` : ''}${plan.interval_brl}${plan.interval_count_brl && plan.interval_count_brl > 1 ? 's' : ''}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                            {plan.interval_count > 1 ? `${plan.interval_count} ` : ''}
                            {plan.interval}{plan.interval_count > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              plan.is_active
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2">
                          {plan.is_featured && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                              ⭐ Featured
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Configuration */}
          {tier.additional_config && Object.keys(tier.additional_config).length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5" />
                <h3 className="text-lg font-medium">Additional Configuration</h3>
              </div>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(tier.additional_config, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </Modal>
  );
}
