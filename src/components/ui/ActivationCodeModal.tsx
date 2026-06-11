'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Hash, AlertTriangle, Activity } from 'lucide-react';
import Modal from './Modal';
import { systemApi, platformAdminApi, superAdminApi } from '@/lib/api';
import {
  TiersApiResponse,
  OrganizationListItem,
  ActivationCode,
  OrgUserRecipientOption,
} from '@/types/api';

type RecipientMode = 'existing_user' | 'open_registration' | '';

interface ActivationCodeFormData {
  description: string | null;
  is_active: boolean;
  tier_id?: number | null;
  organization_id?: number | null;
  recipient_mode?: RecipientMode;
  recipient_user_id?: number | null;
  registration_role?: string | null;
  expires_at?: string | null;
}

const OPEN_REGISTRATION_ROLE_OPTIONS = [
  { value: 'read_only', label: 'Read only' },
  { value: 'member', label: 'Member' },
  { value: 'org_admin', label: 'Organization admin' },
] as const;

interface ActivationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code?: ActivationCode | null;
  type?: 'create' | 'edit' | 'delete';
  onSave: (data: ActivationCodeFormData & { confirm_org_has_tier?: boolean } | null) => void;
  isLoading?: boolean;
}

function formatOrgOption(org: OrganizationListItem): string {
  const tierLabel = org.tier?.trim() ? org.tier : 'No tier';
  return `${org.name} — ${tierLabel}`;
}

export default function ActivationCodeModal({
  isOpen,
  onClose,
  code,
  type = 'create',
  onSave,
  isLoading = false,
}: ActivationCodeModalProps) {
  const isEditing = type === 'edit';
  const isDeleting = type === 'delete';
  const isCreating = type === 'create';
  const [tierOverrideConfirmed, setTierOverrideConfirmed] = useState(false);

  const { data: tiersData } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => systemApi.getTiers(),
  });

  const { data: orgsResponse, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations-for-activation-codes'],
    queryFn: () => platformAdminApi.getOrganizations({ limit: 100, skip: 0 }),
    enabled: isOpen && isCreating,
  });

  const tiers = (tiersData as TiersApiResponse)?.tiers || [];

  const organizations: OrganizationListItem[] = useMemo(() => {
    const payload = orgsResponse as { organizations?: OrganizationListItem[] } | undefined;
    return payload?.organizations ?? [];
  }, [orgsResponse]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ActivationCodeFormData>({
    defaultValues: {
      description: '',
      is_active: true,
      tier_id: null,
      organization_id: null,
      recipient_mode: '',
      registration_role: null,
      expires_at: null,
    },
  });

  const selectedOrgId = watch('organization_id');
  const selectedRecipientUserId = watch('recipient_user_id');
  const recipientMode = watch('recipient_mode');
  const selectedOrg = useMemo(
    () => organizations.find((org) => org.id === Number(selectedOrgId)),
    [organizations, selectedOrgId],
  );
  const selectedOrgHasTier = Boolean(selectedOrg?.tier_id);
  const credentialRegistrationEnabled = Boolean(selectedOrg?.credential_registration_enabled);

  const { data: orgUsersResponse, isLoading: orgUsersLoading } = useQuery({
    queryKey: ['activation-code-org-users', selectedOrgId],
    queryFn: () => superAdminApi.getActivationCodeOrgUsers(Number(selectedOrgId)),
    enabled: isOpen && isCreating && Boolean(selectedOrgId),
  });

  const orgRecipientUsers: OrgUserRecipientOption[] = useMemo(
    () => orgUsersResponse?.users ?? [],
    [orgUsersResponse],
  );

  const defaultRecipientUserId = orgUsersResponse?.default_recipient_user_id ?? null;

  useEffect(() => {
    setTierOverrideConfirmed(false);
    setValue('recipient_user_id', null);
    setValue('recipient_mode', '');
    setValue('registration_role', null);
  }, [selectedOrgId, setValue]);

  useEffect(() => {
    if (
      !isCreating ||
      !defaultRecipientUserId ||
      selectedRecipientUserId ||
      recipientMode !== 'existing_user'
    ) {
      return;
    }
    setValue('recipient_user_id', defaultRecipientUserId);
  }, [isCreating, defaultRecipientUserId, selectedRecipientUserId, recipientMode, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && code) {
        setValue('description', code.description || '');
        setValue('is_active', code.is_active);
        setValue('tier_id', code.tier_id || null);
        if (code.expires_at) {
          const date = new Date(code.expires_at);
          const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 10);
          setValue('expires_at', localDate);
        } else {
          setValue('expires_at', null);
        }
      } else {
        reset({
          description: '',
          is_active: true,
          tier_id: null,
          organization_id: null,
          recipient_mode: '',
          registration_role: null,
          expires_at: null,
        });
        setTierOverrideConfirmed(false);
      }
    }
  }, [isOpen, code, isEditing, setValue, reset]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setTierOverrideConfirmed(false);
    }
  }, [isOpen, reset]);

  const onSubmit = (data: ActivationCodeFormData) => {
    if (isDeleting) {
      onSave(null);
      return;
    }

    const payload: ActivationCodeFormData & { confirm_org_has_tier?: boolean } = {
      description: data.description || null,
      is_active: data.is_active,
    };

    if (!isEditing) {
      if (!data.tier_id) {
        return;
      }
      if (!data.organization_id) {
        return;
      }
      payload.tier_id = data.tier_id;
      payload.organization_id = Number(data.organization_id);

      if (credentialRegistrationEnabled) {
        if (!data.recipient_mode) {
          return;
        }
        payload.recipient_mode = data.recipient_mode;
        if (data.recipient_mode === 'existing_user') {
          if (!data.recipient_user_id) {
            return;
          }
          payload.recipient_user_id = Number(data.recipient_user_id);
        } else {
          if (!data.registration_role) {
            return;
          }
          payload.registration_role = data.registration_role;
        }
      } else {
        payload.recipient_mode = 'existing_user';
        if (!data.recipient_user_id) {
          return;
        }
        payload.recipient_user_id = Number(data.recipient_user_id);
      }

      if (selectedOrgHasTier && !tierOverrideConfirmed) {
        return;
      }
      if (selectedOrgHasTier) {
        payload.confirm_org_has_tier = true;
      }
    } else if (data.tier_id !== undefined) {
      payload.tier_id = data.tier_id || null;
    }

    if (data.expires_at) {
      payload.expires_at = data.expires_at;
    } else {
      payload.expires_at = null;
    }

    onSave(payload);
  };

  const handleCreateClick = handleSubmit((data) => {
    if (isCreating && selectedOrgHasTier && !tierOverrideConfirmed) {
      setTierOverrideConfirmed(true);
      return;
    }
    onSubmit(data);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        isDeleting
          ? 'Delete Activation Code'
          : isEditing
            ? 'Edit Activation Code'
            : 'Create New Activation Code'
      }
    >
      <div className="p-6">
        {isDeleting ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-status-warning" />
              <div>
                <p className="font-medium text-text-primary">
                  Are you sure you want to delete this activation code?
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Code: <code className="bg-bg-secondary dark:bg-gray-700 px-2 py-1 rounded">{code?.code}</code>
                </p>
              </div>
            </div>
            <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
              <p className="text-sm text-text-secondary">
                This action will make the activation code unusable for new trial activations.
                Existing trials activated with this code will not be affected.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={() => onSubmit({} as ActivationCodeFormData)}
                className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Activity className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Deleting...' : 'Delete Code'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={isCreating ? handleCreateClick : handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Code Information</h3>

              {isEditing && code && (
                <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text-primary">Activation Code</span>
                  </div>
                  <code className="text-lg font-mono bg-white dark:bg-gray-900 px-3 py-2 rounded border text-text-primary">
                    {code.code}
                  </code>
                  <p className="text-sm text-text-secondary mt-3">
                    Organization: <span className="font-medium text-text-primary">{code.organization_name}</span>
                    {' '}({code.organization_tier_name})
                  </p>
                </div>
              )}

              {isCreating && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Organization <span className="text-status-error">*</span>
                  </label>
                  <select
                    {...register('organization_id', {
                      required: 'Organization is required',
                      valueAsNumber: true,
                      validate: (value) => (value ? true : 'Organization is required'),
                    })}
                    className="input-field"
                    disabled={isLoading || orgsLoading}
                  >
                    <option value="">Select an organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {formatOrgOption(org)}
                      </option>
                    ))}
                  </select>
                  {errors.organization_id && (
                    <p className="text-xs text-status-error">{errors.organization_id.message as string}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Free trial codes are intended for organizations without a tier. The code is reserved for the selected organization.
                  </p>

                  {selectedOrg && selectedOrgHasTier && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900 dark:text-amber-100">
                          <p className="font-medium">
                            This organization already has a tier ({selectedOrg.tier}).
                          </p>
                          <p className="mt-1">
                            Free trial activation is normally for organizations that do not have a tier yet.
                            Users in this org will not be able to activate a trial until the tier is removed.
                          </p>
                          {!tierOverrideConfirmed ? (
                            <p className="mt-2 font-medium">
                              Click &quot;Create Code&quot; again to confirm you still want to create this code.
                            </p>
                          ) : (
                            <p className="mt-2 font-medium text-status-success">
                              Confirmed — you can submit to create the code.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCreating && selectedOrgId && credentialRegistrationEnabled && (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium text-text-primary">
                    Trial code delivery <span className="text-status-error">*</span>
                  </p>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-brand-navy has-[:checked]:bg-bg-light-2">
                      <input
                        type="radio"
                        value="existing_user"
                        className="mt-1"
                        disabled={isLoading}
                        {...register('recipient_mode', {
                          required: credentialRegistrationEnabled
                            ? 'Select how the trial code should be delivered'
                            : false,
                        })}
                      />
                      <span>
                        <span className="block text-sm font-medium text-text-primary">
                          Email to existing user
                        </span>
                        <span className="mt-1 block text-xs text-text-secondary">
                          Send the activation code to a user already created in this organization.
                          After activation they sign in with their existing account — no credential
                          self-registration step.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-brand-navy has-[:checked]:bg-bg-light-2">
                      <input
                        type="radio"
                        value="open_registration"
                        className="mt-1"
                        disabled={isLoading}
                        {...register('recipient_mode', {
                          required: credentialRegistrationEnabled
                            ? 'Select how the trial code should be delivered'
                            : false,
                        })}
                      />
                      <span>
                        <span className="block text-sm font-medium text-text-primary">
                          Open credential registration
                        </span>
                        <span className="mt-1 block text-xs text-text-secondary">
                          No email recipient. Share the code manually. Whoever activates can register
                          with email and password and receives the role you assign below.
                        </span>
                      </span>
                    </label>
                  </div>
                  {errors.recipient_mode && (
                    <p className="text-xs text-status-error">
                      {errors.recipient_mode.message as string}
                    </p>
                  )}
                </div>
              )}

              {isCreating && selectedOrgId && (!credentialRegistrationEnabled || recipientMode === 'existing_user') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Email recipient <span className="text-status-error">*</span>
                  </label>
                  <select
                    {...register('recipient_user_id', {
                      required: !credentialRegistrationEnabled || recipientMode === 'existing_user'
                        ? 'Recipient is required'
                        : false,
                      valueAsNumber: true,
                      validate: (value) => {
                        if (!credentialRegistrationEnabled || recipientMode === 'existing_user') {
                          return value ? true : 'Recipient is required';
                        }
                        return true;
                      },
                    })}
                    className="input-field"
                    disabled={isLoading || orgUsersLoading || orgRecipientUsers.length === 0}
                  >
                    <option value="">Select a user...</option>
                    {orgRecipientUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} — ${u.email}` : u.email}
                        {u.is_org_admin ? ' (Org admin)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.recipient_user_id && (
                    <p className="text-xs text-status-error">
                      {errors.recipient_user_id.message as string}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The activation code will be emailed to this user. Org admin is selected by default.
                  </p>
                </div>
              )}

              {isCreating && selectedOrgId && credentialRegistrationEnabled && recipientMode === 'open_registration' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Role after registration <span className="text-status-error">*</span>
                  </label>
                  <select
                    {...register('registration_role', {
                      required: 'Registration role is required',
                      validate: (value) => (value ? true : 'Registration role is required'),
                    })}
                    className="input-field"
                    disabled={isLoading}
                  >
                    <option value="">Select a role...</option>
                    {OPEN_REGISTRATION_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.registration_role && (
                    <p className="text-xs text-status-error">
                      {errors.registration_role.message as string}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The user who activates the code and completes credential registration will receive this role.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Description</label>
                <textarea
                  {...register('description')}
                  placeholder="Optional description for this activation code..."
                  className="input-field resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  Trial tier <span className="text-status-error">*</span>
                </label>
                <select
                  {...register('tier_id', {
                    required: !isEditing ? 'Tier is required' : false,
                    valueAsNumber: true,
                    validate: (value) => {
                      if (!isEditing && !value) {
                        return 'Tier is required';
                      }
                      return true;
                    },
                  })}
                  className="input-field"
                  disabled={isLoading}
                >
                  <option value="">Select a tier...</option>
                  {tiers.map((tier: { id: number; name: string }) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
                {errors.tier_id && (
                  <p className="text-xs text-status-error">{errors.tier_id.message as string}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The tier assigned to the organization when this code is redeemed
                </p>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium text-text-primary">Expiration Settings</h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Expiration date</label>
                  <input
                    type="date"
                    {...register('expires_at')}
                    className="input-field"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isEditing
                      ? 'Set a specific date for expiration. Leave empty to remove expiration.'
                      : 'Optional — code expires at end of the selected day'}
                  </p>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setValue('expires_at', null)}
                      className="text-xs text-status-error hover:text-status-error-dark underline"
                    >
                      Clear expiration
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Status Settings</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  checked={watch('is_active')}
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  disabled={isLoading}
                />
                <label className="text-sm font-medium text-text-primary">Code is active and can be used</label>
              </div>
            </div>

            {isEditing && code && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-text-primary">Code Status</h3>
                <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">Status</p>
                      <p className="text-text-secondary">{code.is_used ? 'Used' : 'Available'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Created</p>
                      <p className="text-text-secondary">{new Date(code.created_at).toLocaleDateString()}</p>
                    </div>
                    {code.used_at && (
                      <div>
                        <p className="font-medium text-text-primary">Used On</p>
                        <p className="text-text-secondary">{new Date(code.used_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCreating && selectedOrgHasTier && !tierOverrideConfirmed
                  ? 'Confirm & Create Code'
                  : isEditing
                    ? 'Update Code'
                    : 'Create Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
