import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Modal from './Modal';
import { systemApi } from '@/lib/api';
import { Tier, TiersApiResponse, Organization } from '@/types/api';

interface OrganizationFormData {
  name: string;
  tier_id: string;
  service_type: string;
  billing_location: 'WORLD' | 'BRAZIL';
  credential_login_enabled: boolean;
  credential_registration_enabled: boolean;
}

export interface OrganizationFormPayload {
  name: string;
  tier_id: number | null;
  service_type: string;
  billing_location: 'WORLD' | 'BRAZIL';
  credential_login_enabled: boolean;
  credential_registration_enabled: boolean;
}

interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization | null;
  onSubmit: (data: OrganizationFormPayload) => void;
  isLoading?: boolean;
}


const OrganizationModal: React.FC<OrganizationModalProps> = ({
  isOpen,
  onClose,
  organization,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = !!organization;

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      tier_id: '',
      service_type: '',
      billing_location: 'WORLD',
      credential_login_enabled: false,
      credential_registration_enabled: false,
    }
  });

  const credLoginEnabled = watch('credential_login_enabled');

  // Fetch available tiers
  const { data: tiersData } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => systemApi.getTiers(),
    enabled: isOpen,
  });

  const tiers = (tiersData as TiersApiResponse)?.tiers || [];

  // Load organization data when editing or reset when creating
  useEffect(() => {
    if (isOpen) {
      if (isEditing && organization) {
        setValue('name', organization.name || '');
        const tierId = organization.tier_id ?? organization.tier?.id;
        setValue('tier_id', tierId != null ? String(tierId) : '');
        setValue('service_type', organization.service_type || '');
        setValue('billing_location', organization.billing_location || 'WORLD');
        setValue('credential_login_enabled', organization.credential_login_enabled ?? false);
        setValue('credential_registration_enabled', organization.credential_registration_enabled ?? false);
      } else {
        reset({
          name: '',
          tier_id: '',
          service_type: '',
          billing_location: 'WORLD',
          credential_login_enabled: false,
          credential_registration_enabled: false,
        });
      }
    }
  }, [isOpen, organization, isEditing, setValue, reset]);

  // Reset form when modal is closed to prevent state bleeding
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onFormSubmit = (data: OrganizationFormData) => {
    if (!data.service_type || data.service_type === '') {
      return;
    }
    const payload: OrganizationFormPayload = {
      name: data.name.trim(),
      tier_id: data.tier_id && data.tier_id !== '' ? parseInt(data.tier_id) : null,
      service_type: data.service_type,
      billing_location: data.billing_location,
      credential_login_enabled: data.credential_login_enabled,
      credential_registration_enabled: data.credential_login_enabled ? data.credential_registration_enabled : false,
    };

    onSubmit(payload);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title={organization ? `Edit Organization - ${organization.name}` : 'Create New Organization'}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Organization Information</h3>

            {/* Organization Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Organization Name *
              </label>
              <input
                type="text"
                {...register('name', {
                  required: 'Organization name is required',
                  minLength: {
                    value: 1,
                    message: 'Organization name must be at least 1 character'
                  },
                  maxLength: {
                    value: 255,
                    message: 'Organization name must be less than 255 characters'
                  }
                })}
                placeholder="Enter organization name"
                className="input-field"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Tier Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Tier
              </label>
              <select
                {...register('tier_id')}
                className="input-field"
                disabled={isLoading}
              >
                <option value="">No Tier (No Access)</option>
                {tiers.map((tier: Tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} {tier.description && `- ${tier.description}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Service Type *
              </label>
              <select
                {...register('service_type', {
                  required: 'Service type is required'
                })}
                className="input-field"
                disabled={isLoading}
              >
                <option value="">Select Service Type</option>
                <option value="PLATFORM">PLATFORM</option>
                <option value="API_ONLY">API_ONLY</option>
              </select>
              {errors.service_type && (
                <p className="text-sm text-red-600">{errors.service_type.message}</p>
              )}
            </div>

            {/* Billing Location Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Billing Location *
              </label>
              <select
                {...register('billing_location', {
                  required: 'Billing location is required'
                })}
                className="input-field"
                disabled={isLoading}
              >
                <option value="WORLD">World</option>
                <option value="BRAZIL">Brazil</option>
              </select>
              {errors.billing_location && (
                <p className="text-sm text-red-600">{errors.billing_location.message}</p>
              )}
            </div>

            {/* Credential Authentication */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-text-primary">Credential Authentication</h4>
              <p className="text-xs text-text-secondary">
                Control whether users in this organization can log in or register with email and password.
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="credential_login_enabled" className="text-sm font-medium text-text-primary">
                    Allow credential login
                  </label>
                  <p className="text-xs text-text-secondary">Users can sign in with email and password</p>
                </div>
                <input
                  id="credential_login_enabled"
                  type="checkbox"
                  {...register('credential_login_enabled')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={isLoading}
                />
              </div>

              <div className={`flex items-center justify-between ${!credLoginEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <label htmlFor="credential_registration_enabled" className="text-sm font-medium text-text-primary">
                    Allow credential registration
                  </label>
                  <p className="text-xs text-text-secondary">New users can create accounts with email and password (requires login enabled)</p>
                </div>
                <input
                  id="credential_registration_enabled"
                  type="checkbox"
                  {...register('credential_registration_enabled')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={isLoading || !credLoginEnabled}
                />
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Organization' : 'Create Organization')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default OrganizationModal;
