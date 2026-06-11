'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { superAdminApi } from '@/lib/api';
import { TierAdmin, TierCreateRequest, TierUpdateRequest } from '@/types/api';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import Modal from '@/components/ui/Modal';

interface TierDialogProps {
  tier?: TierAdmin | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  max_users: string;
  max_laws: string;
  api_calls_limit: string;
  reports_limit: string;
  word_limit_per_submission: string;
  law_change_cooldown_days: string;
  custom_branding: boolean;
  sort_order: string;
}

export function TierDialog({ tier, isOpen, onClose, onSuccess, mode }: TierDialogProps) {
  const isEditing = mode === 'edit' && tier;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      max_users: '1',
      max_laws: '1',
      api_calls_limit: '100000',
      reports_limit: '1',
      word_limit_per_submission: '1000',
      law_change_cooldown_days: '-1',
      custom_branding: false,
      sort_order: '0',
    }
  });

  // Load tier data when editing
  useEffect(() => {
    if (isEditing && tier) {
      setValue('name', tier.name);
      setValue('slug', tier.slug);
      setValue('description', tier.description || '');
      setValue('max_users', tier.max_users.toString());
      setValue('max_laws', tier.max_laws);
      setValue('api_calls_limit', tier.api_calls_limit.toString());
      setValue('reports_limit', tier.reports_limit.toString());
      setValue('word_limit_per_submission', tier.word_limit_per_submission.toString());
      setValue('law_change_cooldown_days', tier.law_change_cooldown_days?.toString() || '');
      setValue('custom_branding', tier.custom_branding);
      setValue('sort_order', tier.sort_order.toString());
    } else if (mode === 'create') {
      reset();
    }
  }, [tier, isEditing, mode, setValue, reset]);

  const createMutation = useMutation({
    mutationFn: (data: TierCreateRequest) => superAdminApi.createTier(data),
    onSuccess: () => {
      toast.success('Tier created successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create tier'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TierUpdateRequest) => superAdminApi.updateTier(tier!.id, data),
    onSuccess: () => {
      toast.success('Tier updated successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update tier'));
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      max_users: parseInt(data.max_users),
      max_laws: data.max_laws,
      api_calls_limit: parseInt(data.api_calls_limit),
      reports_limit: parseInt(data.reports_limit),
      word_limit_per_submission: parseInt(data.word_limit_per_submission),
      law_change_cooldown_days: data.law_change_cooldown_days !== '' ? parseInt(data.law_change_cooldown_days) : 0,
      custom_branding: data.custom_branding,
      sort_order: parseInt(data.sort_order),
      additional_config: {},
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as TierCreateRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Auto-generate slug from name
  const watchedName = watch('name');
  useEffect(() => {
    if (!isEditing && watchedName) {
      const slug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', slug);
    }
  }, [watchedName, isEditing, setValue]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit Tier' : 'Create New Tier'}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Tier Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g., Pro, Enterprise"
                  className="input-field"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Slug *</label>
                <input
                  {...register('slug', {
                    required: 'Slug is required',
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: 'Slug can only contain lowercase letters, numbers, and hyphens'
                    }
                  })}
                  placeholder="e.g., pro, enterprise"
                  className="input-field"
                />
                {errors.slug && (
                  <p className="text-sm text-red-600">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Description</label>
              <textarea
                {...register('description')}
                placeholder="Describe this tier's target audience and features"
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={watch('custom_branding')}
                onChange={(e) => setValue('custom_branding', e.target.checked)}
                className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
              />
              <label className="text-sm font-medium text-text-primary">Custom Branding</label>
            </div>
          </div>

          {/* Limits and Quotas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Limits & Quotas</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Max Users *</label>
                <input
                  type="number"
                  min="1"
                  {...register('max_users', {
                    required: 'Max users is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  className="input-field"
                />
                {errors.max_users && (
                  <p className="text-sm text-red-600">{errors.max_users.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Max Laws *</label>
                <input
                  {...register('max_laws', { required: 'Max laws is required' })}
                  placeholder="e.g., 5 or -1 for unlimited"
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Use -1 for unlimited</p>
                {errors.max_laws && (
                  <p className="text-sm text-red-600">{errors.max_laws.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">API Calls Limit *</label>
                <input
                  type="number"
                  min="1"
                  {...register('api_calls_limit', {
                    required: 'API calls limit is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  className="input-field"
                />
                {errors.api_calls_limit && (
                  <p className="text-sm text-red-600">{errors.api_calls_limit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Reports Limit *</label>
                <input
                  type="number"
                  min="1"
                  {...register('reports_limit', {
                    required: 'Reports limit is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  className="input-field"
                />
                {errors.reports_limit && (
                  <p className="text-sm text-red-600">{errors.reports_limit.message}</p>
                )}
              </div>


              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Word Limit per Submission *</label>
                <input
                  type="number"
                  min="1"
                  {...register('word_limit_per_submission', {
                    required: 'Word limit is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  className="input-field"
                />
                {errors.word_limit_per_submission && (
                  <p className="text-sm text-red-600">{errors.word_limit_per_submission.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Additional Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Law Change Cooldown (days) *</label>
                <input
                  type="number"
                  min="-1"
                  {...register('law_change_cooldown_days', {required: 'Law Change Cooldown is required'})}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Leave 0 to disable law changes</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Leave -1 to enable no limit changes</p>
                {errors.sort_order && (
                  <p className="text-sm text-red-600">{errors.sort_order.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Sort Order *</label>
                <input
                  type="number"
                  min="0"
                  {...register('sort_order', {
                    required: 'Sort order is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Lower numbers appear first</p>
                {errors.sort_order && (
                  <p className="text-sm text-red-600">{errors.sort_order.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Tier' : 'Create Tier'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
