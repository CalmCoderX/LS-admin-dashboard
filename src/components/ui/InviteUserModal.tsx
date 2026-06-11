'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UserRole } from '@/types/api';
import Modal from './Modal';

interface InviteUserFormData {
  email: string;
  name: string;
  role: UserRole;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  onSave: (userData: {
    email: string;
    name?: string;
    role: UserRole;
    org_id: number;
  }) => void;
  isLoading: boolean;
  orgId: number;
}

export default function InviteUserModal({
  isOpen,
  onClose,
  organizationName,
  onSave,
  isLoading,
  orgId,
}: InviteUserModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteUserFormData>({
    defaultValues: {
      email: '',
      name: '',
      role: 'read_only' as UserRole,
    }
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        email: '',
        name: '',
        role: 'read_only' as UserRole,
      });
    }
  }, [isOpen, reset]);

  // Reset form when modal is closed to prevent state bleeding
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onFormSubmit = (data: InviteUserFormData) => {
    onSave({
      email: data.email,
      name: data.name || undefined,
      role: data.role,
      org_id: orgId,
    });
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
      title={`Invite User to ${organizationName}`}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <p className="text-sm text-text-secondary">
            Send an invitation email so the user can sign in and join the organization.
            They will appear as Invitation sent until they accept.
          </p>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">User details</h3>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Email Address *
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
                placeholder="user@example.com"
                className="input-field"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Role *
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                className="input-field"
                disabled={isLoading}
              >
                <option value="read_only">Read Only</option>
                <option value="member">Member</option>
                <option value="org_admin">Organization Admin</option>
              </select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Name (Optional)
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="Full name"
                className="input-field"
                disabled={isLoading}
              />
            </div>
          </div>

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
              {isLoading ? 'Sending invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
