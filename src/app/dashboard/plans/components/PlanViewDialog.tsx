'use client';

import { DollarSign, Package, CreditCard, Star, Info, ExternalLink } from 'lucide-react';
import { PlanAdmin } from '@/types/api';
import Modal from '@/components/ui/Modal';

interface PlanViewDialogProps {
  plan: PlanAdmin & { 
    tier?: {
      id: number;
      name: string;
      slug: string;
      description?: string;
      max_users?: number;
      max_laws?: string;
      api_calls_limit?: number;
      custom_branding?: boolean;
    } | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function PlanViewDialog({ plan, isOpen, onClose }: PlanViewDialogProps) {
  const hasBrl = plan.amount_brl != null;
  const usdIntervalLabel = `${plan.interval_count > 1 ? `${plan.interval_count} ` : ''}${plan.interval}${plan.interval_count > 1 ? 's' : ''}`;
  const brlIntervalLabel = `${(plan.interval_count_brl ?? 1) > 1 ? `${plan.interval_count_brl} ` : ''}${plan.interval_brl || plan.interval}${(plan.interval_count_brl ?? 1) > 1 ? 's' : ''}`;

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={plan.name + ' - ' + (plan.is_active ? 'Active' : 'Inactive')}>
      <div className="p-6">
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="card border-2 border-blue-100 dark:border-blue-900/20">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5" />
              <h3 className="text-lg font-medium">Plan Overview</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-baseline gap-1 justify-center md:justify-start">
                  <span className="text-3xl font-bold">
                    {formatPrice(plan.amount, 'USD')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    per {usdIntervalLabel}
                  </span>
                </div>
                {hasBrl && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    BRL option: {formatPrice(plan.amount_brl as number, 'BRL')} per {brlIntervalLabel}
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <div className="text-center space-y-1">
                  <div className="text-sm font-medium text-green-600">USD</div>
                  {hasBrl && <div className="text-sm font-medium text-blue-600">BRL</div>}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Currency Options</div>
                </div>
              </div>
            </div>

            {plan.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {plan.description}
              </p>
            )}
            {plan.name_brl && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Brazil name: {plan.name_brl}
              </p>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5" />
                <h3 className="text-lg font-medium">Plan Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan ID</label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{plan.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{plan.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-base text-gray-900 dark:text-gray-100">{plan.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Featured</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${plan.is_featured ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                    <span className="text-base text-gray-900 dark:text-gray-100">{plan.is_featured ? 'Yes' : 'No'}</span>
                    {plan.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5" />
                <h3 className="text-lg font-medium">Pricing Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount (USD)</label>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(plan.amount, 'USD')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Interval: {usdIntervalLabel}
                  </p>
                </div>

                {hasBrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount (BRL)</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {formatPrice(plan.amount_brl as number, 'BRL')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Interval: {brlIntervalLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Associated Tier */}
          {plan.tier && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-medium">Associated Tier</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The service tier this plan provides access to
              </p>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-lg">{plan.tier.name}</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                    {plan.tier.slug}
                  </span>
                </div>

                {plan.tier.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.tier.description}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {plan.tier.max_users && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Max Users:</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{plan.tier.max_users}</div>
                    </div>
                  )}
                  {plan.tier.max_laws && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Max Laws:</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {plan.tier.max_laws === '-1' ? 'Unlimited' : plan.tier.max_laws}
                      </div>
                    </div>
                  )}
                  {plan.tier.api_calls_limit && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">API Calls:</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{plan.tier.api_calls_limit.toLocaleString()}</div>
                    </div>
                  )}
                  {plan.tier.custom_branding && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Branding:</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Custom</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stripe Integration */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              <h3 className="text-lg font-medium">Stripe Integration</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Stripe product and price identifiers for billing
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stripe Product ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm flex-1">
                    {plan.stripe_product_id}
                  </code>
                  <button
                    onClick={() => window.open(`https://dashboard.stripe.com/products/${plan.stripe_product_id}`, '_blank')}
                    className="btn-secondary p-2"
                    title="Open in Stripe"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stripe Product ID (Brazil)</label>
                {plan.stripe_product_id_brl ? (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm flex-1">
                      {plan.stripe_product_id_brl}
                    </code>
                    <button
                      onClick={() => window.open(`https://dashboard.stripe.com/products/${plan.stripe_product_id_brl}`, '_blank')}
                      className="btn-secondary p-2"
                      title="Open in Stripe"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Not configured</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stripe Price ID (USD)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm flex-1">
                    {plan.stripe_price_id}
                  </code>
                  <button
                    onClick={() => window.open(`https://dashboard.stripe.com/prices/${plan.stripe_price_id}`, '_blank')}
                    className="btn-secondary p-2"
                    title="Open in Stripe"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stripe Price ID (BRL)</label>
                {plan.stripe_price_id_brl ? (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm flex-1">
                      {plan.stripe_price_id_brl}
                    </code>
                    <button
                      onClick={() => window.open(`https://dashboard.stripe.com/prices/${plan.stripe_price_id_brl}`, '_blank')}
                      className="btn-secondary p-2"
                      title="Open in Stripe"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Not configured</p>
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5" />
              <h3 className="text-lg font-medium">Timestamps</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-base text-gray-900 dark:text-gray-100">{formatDate(plan.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                <p className="text-base text-gray-900 dark:text-gray-100">{formatDate(plan.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </Modal>
  );
}
