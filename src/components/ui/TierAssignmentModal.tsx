import React from 'react';
import { Crown, Trash2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Tier, Organization } from '@/types/api';

interface TierAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
  tiers: Tier[];
  onTierChange: (orgId: number, tierSlug: string) => void;
  onTierRemove?: (orgId: number) => void;
  isLoading?: boolean;
}

const TierAssignmentModal: React.FC<TierAssignmentModalProps> = ({
  isOpen,
  onClose,
  organization,
  tiers,
  onTierChange,
  onTierRemove,
  isLoading = false,
}) => {
  if (!organization) return null;

  const handleTierSelect = (tier: Tier) => {
    // Check if this tier is currently assigned
    const hasCurrentTier = organization.tier && (organization.tier.name || organization.tier.slug);
    const isCurrentTier = hasCurrentTier && (
      organization.tier?.name === tier.name || 
      organization.tier?.slug === tier.slug
    );
    
    if (!isCurrentTier && !isLoading) {
      onTierChange(organization.id, tier.slug || tier.name);
    }
  };

  const handleTierRemove = () => {
    if (onTierRemove && !isLoading && organization.tier) {
      onTierRemove(organization.id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={`Change Tier - ${organization.name}`}
    >
      <div className="p-6">
        <div className="space-y-4">
          {!organization.tier || (!organization.tier.name && !organization.tier.slug) ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    No Tier Assigned
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    This organization currently has no tier. Select a tier below to enable platform features.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Select a new tier for this organization.
            </p>
          )}

          <div className="space-y-3">
            {tiers.map((tier) => {
              const hasCurrentTier = organization.tier && (organization.tier.name || organization.tier.slug);
              const isCurrentTier = hasCurrentTier && (
                organization.tier?.name === tier.name || 
                organization.tier?.slug === tier.slug
              );

              return (
                <div
                  key={tier.id}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isCurrentTier
                      ? 'border-brand-navy bg-brand-navy/10 dark:bg-brand-navy/20 cursor-default'
                      : 'border-bg-light-6 dark:border-gray-700 hover:bg-bg-light-1 dark:hover:bg-gray-800 cursor-pointer'
                  } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleTierSelect(tier)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isCurrentTier ? 'text-brand-navy dark:text-brand-navy' : 'text-text-primary'}`}>
                          {tier.name}
                        </p>
                        {isCurrentTier && (
                          <span className="px-2 py-1 text-xs font-medium bg-brand-navy dark:bg-brand-navy text-white rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{tier.description}</p>
                    </div>
                    <Crown className={`w-5 h-5 ${isCurrentTier ? 'text-brand-navy dark:text-brand-navy' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remove Tier Option */}
          {organization.tier && onTierRemove && (
            <div className="pt-4 border-t border-bg-light-6 dark:border-gray-700">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Remove Current Tier
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Removing the tier will reset all quotas to no-access (0) and prevent the organization from using platform features.
                    </p>
                    <button
                      type="button"
                      onClick={handleTierRemove}
                      disabled={isLoading}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Tier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-bg-light-6 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TierAssignmentModal;
