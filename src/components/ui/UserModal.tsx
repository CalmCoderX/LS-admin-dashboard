'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Clock, User as UserIcon, RefreshCw, Ban, Trash2 } from 'lucide-react';
import { User, UserRole, Organization } from '@/types/api';
import { USER_ROLES } from '@/constants/roles';
import { format } from 'date-fns';
import Modal from './Modal';
import { systemApi } from '@/lib/api';

interface UserFormData {
  name: string;
  email: string;
  phone_number?: string;
  preferred_language?: string;
  role: string;
  org_id?: number;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  organizations: Organization[];
  onSave: (data: UserFormData) => void;
  isLoading?: boolean;
}

const getLastActionInfo = (user: User) => {
  if (!user.last_action || !user.last_action_by || !user.last_action_at) {
    return (
      <div className="flex items-center justify-center py-8 text-text-secondary">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent actions on this user</p>
        </div>
      </div>
    );
  }

  const actionConfig = {
    suspended: { icon: Ban, color: 'text-orange-600' },
    reactivated: { icon: RefreshCw, color: 'text-green-600' },
    deleted: { icon: Trash2, color: 'text-red-600' },
    restored: { icon: RefreshCw, color: 'text-blue-600' },
  };

  const config = actionConfig[user.last_action as keyof typeof actionConfig] || { icon: Clock, color: 'text-gray-600' };
  const Icon = config.icon;

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium text-sm ${config.color}`}>
              {user.last_action.charAt(0).toUpperCase() + user.last_action.slice(1)}
            </span>
            <span className="text-xs text-text-secondary">
              {format(new Date(user.last_action_at), 'MMM dd, yyyy \'at\' h:mm a')}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Action performed by {user.last_action_by}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function UserModal({
  isOpen,
  onClose,
  user,
  organizations,
  onSave,
  isLoading = false,
}: UserModalProps) {
  const isEditing = !!user;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<UserFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      preferred_language: 'en',
      role: UserRole.MEMBER,
      org_id: 0,
    }
  });

  // Fetch available languages
  const { data: languagesData } = useQuery<{ languages: Array<{ code: string; name: string; native_name: string }> }>({
    queryKey: ['languages'],
    queryFn: async () => {
      const response = await systemApi.getLanguages();
      return response as { languages: Array<{ code: string; name: string; native_name: string }> };
    },
    staleTime: 300000, // Cache for 5 minutes
  });

  const languages = languagesData?.languages || [
    { code: 'en', name: 'English', native_name: 'English' },
    { code: 'pt', name: 'Portuguese', native_name: 'Português' },
  ];

  // Load user data when editing or reset when creating
  useEffect(() => {
    if (isOpen) {
      if (isEditing && user) {
        // Editing mode - populate with user data
        setValue('name', user.name || '');
        setValue('email', user.email);
        setValue('phone_number', user.phone_number || '');
        setValue('preferred_language', user.preferred_language || 'en');
        setValue('role', user.role as UserRole);
        setValue('org_id', user.organization?.id || 0);
      } else {
        // Create mode - reset to defaults
        reset({
          name: '',
          email: '',
          phone_number: '',
          preferred_language: 'en',
          role: UserRole.MEMBER,
          org_id: 0,
        });
      }
    }
  }, [isOpen, user, isEditing, setValue, reset, organizations]);

  // Reset form when modal is closed to prevent state bleeding
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = (data: UserFormData) => {
    onSave(data);
  };

  const selectedOrgId = watch('org_id') || 0;
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit User' : 'Invite User'}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!isEditing && (
            <p className="text-sm text-text-secondary">
              Send an invitation email so the user can sign in and join the organization.
              They will appear as Invitation sent until they accept.
            </p>
          )}
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="John Doe"
                  className="input-field"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Email Address *</label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  placeholder="john.doe@company.com"
                  className="input-field"
                  disabled={isLoading || isEditing}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Email cannot be changed for existing users
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Phone Number</label>
                <input
                  type="tel"
                  {...register('phone_number')}
                  placeholder="+1234567890"
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Preferred Language</label>
                <select
                  {...register('preferred_language')}
                  className="input-field"
                  disabled={isLoading}
                >
                  {languages.map((lang: { code: string; name: string; native_name: string }) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native_name} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Role *</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="input-field"
                  disabled={isLoading}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Organization *</label>
                <select
                  {...register('org_id', {
                    required: 'Organization is required',
                    validate: value => value !== 0 || 'Please select an organization',
                    setValueAs: (value) => parseInt(value),
                  })}
                  className="input-field"
                  disabled={isLoading}
                >
                  <option value="0">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                {errors.org_id && (
                  <p className="text-sm text-red-600">{errors.org_id.message}</p>
                )}
              </div>
            </div>
          </div>


          {/* Organization Preview */}
          {selectedOrg && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Organization Preview</h3>
              <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{selectedOrg.name}</p>
                    {selectedOrg.tier && (
                      <p className="text-text-secondary">Tier: {selectedOrg.tier.name}</p>
                    )}
                  </div>
                  <div className="text-text-secondary">
                    <p>Created: {selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : 'N/A'}</p>
                    <p>Status: {selectedOrg.subscription_status || 'Active'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Action Info - Only show when editing */}
          {isEditing && user && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Last Action</h3>
              <div className="bg-bg-light-2 dark:bg-gray-800 p-4 rounded-lg border">
                {getLastActionInfo(user)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update User' : isLoading ? 'Sending invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
