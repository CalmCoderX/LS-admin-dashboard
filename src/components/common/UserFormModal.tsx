'use client';

import React from 'react';
import { User, UserRole, Organization } from '@/types/api';
import { USER_ROLES } from '@/constants/roles';
import FormModal, { FormSection } from './FormModal';

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  org_id: string;
  is_active: boolean;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  organizations: Organization[];
  onSave: (data: UserFormData) => void;
  isLoading?: boolean;
}

export default function UserFormModal({
  isOpen,
  onClose,
  user,
  organizations,
  onSave,
  isLoading = false
}: UserFormModalProps) {
  const isEditing = !!user;

  const defaultValues: Partial<UserFormData> = user ? {
    name: user.name || '',
    email: user.email,
    role: user.role,
    org_id: user.organization?.id?.toString() || '',
    is_active: user.is_active
  } : {
    name: '',
    email: '',
    role: UserRole.MEMBER,
    org_id: '',
    is_active: true
  };

  const sections: FormSection<UserFormData>[] = [
    {
      title: 'Basic Information',
      description: 'User identity and contact information',
      columns: 2,
      fields: [
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          placeholder: 'John Doe',
          required: true,
          validation: { minLength: { value: 2, message: 'Name must be at least 2 characters' } }
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          placeholder: 'john.doe@company.com',
          required: true,
          disabled: isEditing, // Email typically can't be changed after creation
          validation: {
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }
        }
      ]
    },
    {
      title: 'Role & Organization',
      description: 'User permissions and organizational assignment',
      columns: 2,
      fields: [
        {
          name: 'role',
          label: 'User Role',
          type: 'select',
          required: true,
          options: [...USER_ROLES],
          description: 'Determines user permissions and access level'
        },
        {
          name: 'org_id',
          label: 'Organization',
          type: 'select',
          required: true,
          options: organizations.map(org => ({
            value: org.id.toString(),
            label: org.name
          })),
          description: 'Organization the user belongs to'
        }
      ]
    },
    {
      title: 'Account Status',
      description: 'User account settings',
      columns: 1,
      fields: [
        {
          name: 'is_active',
          label: 'Active Account',
          type: 'checkbox',
          placeholder: 'User can log in and access the system',
          description: 'Inactive users cannot log in but their data is preserved'
        }
      ]
    }
  ];

  return (
    <FormModal<UserFormData>
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User' : 'Create New User'}
      sections={sections}
      onSubmit={onSave}
      isLoading={isLoading}
      submitLabel={isEditing ? 'Update User' : 'Create User'}
      defaultValues={defaultValues}
      mode={isEditing ? 'edit' : 'create'}
      size="lg"
    />
  );
}
