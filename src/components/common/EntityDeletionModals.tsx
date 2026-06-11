'use client';

import React from 'react';
import ConfirmationModal, {
  DeleteConfirmationModal,
  DestructiveConfirmationModal
} from './ConfirmationModal';

// Generic soft deletion modal
interface SoftDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityType: string;
  entityName: string;
  isLoading?: boolean;
  consequences?: string[];
}

export function SoftDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  isLoading = false,
  consequences = []
}: SoftDeleteModalProps) {
  const defaultConsequences = [
    `${entityType} will be hidden from normal views`,
    'Data will be preserved and can be restored',
    'Associated relationships will be maintained',
    'Action can be reversed'
  ];

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${entityType}`}
      description={`Are you sure you want to delete this ${entityType.toLowerCase()}? This action will hide the ${entityType.toLowerCase()} but can be undone later.`}
      itemName={entityName}
      isLoading={isLoading}
      consequences={consequences.length > 0 ? consequences : defaultConsequences}
      confirmLabel={`Delete ${entityType}`}
    />
  );
}

// Generic permanent deletion modal
interface PermanentDeleteModalProps extends SoftDeleteModalProps {
  confirmationText?: string;
}

export function PermanentDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  isLoading = false,
  consequences = [],
  confirmationText = 'PERMANENTLY DELETE'
}: PermanentDeleteModalProps) {
  const defaultConsequences = [
    `${entityType} will be completely removed`,
    'All data will be permanently lost',
    'Associated records will be cleaned up',
    'This action cannot be reversed'
  ];

  return (
    <DestructiveConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Permanently Delete ${entityType}`}
      description={`This will permanently delete the ${entityType.toLowerCase()} and all associated data. This action cannot be undone.`}
      itemName={entityName}
      isLoading={isLoading}
      consequences={consequences.length > 0 ? consequences : defaultConsequences}
      confirmLabel={`Delete Forever`}
      confirmationText={confirmationText}
    />
  );
}

// Generic restore modal
interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityType: string;
  entityName: string;
  isLoading?: boolean;
}

export function RestoreModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  isLoading = false
}: RestoreModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Restore ${entityType}`}
      description={`Are you sure you want to restore this ${entityType.toLowerCase()}? This will make it accessible and visible again.`}
      itemName={entityName}
      isLoading={isLoading}
      confirmLabel={`Restore ${entityType}`}
      type="success"
      consequences={[
        `${entityType} will become visible and accessible`,
        'All functionality will be restored',
        'Users can interact with it normally'
      ]}
    />
  );
}

// Specific entity deletion modals for common use cases
export const UserDeletionModals = {
  SoftDelete: (props: Omit<SoftDeleteModalProps, 'entityType' | 'consequences'>) => (
    <SoftDeleteModal
      {...props}
      entityType="User"
      consequences={[
        'User will be hidden from normal views',
        'User will not be able to log in',
        'User data will be preserved',
        'Action can be reversed by restoring the user'
      ]}
    />
  ),
  PermanentDelete: (props: Omit<PermanentDeleteModalProps, 'entityType' | 'consequences'>) => (
    <PermanentDeleteModal
      {...props}
      entityType="User"
      consequences={[
        'User account will be completely removed',
        'All user data will be permanently deleted',
        'All associated records will be cleaned up',
        'This action cannot be reversed'
      ]}
    />
  ),
  Restore: (props: Omit<RestoreModalProps, 'entityType'>) => (
    <RestoreModal {...props} entityType="User" />
  )
};

export const OrganizationDeletionModals = {
  SoftDelete: (props: Omit<SoftDeleteModalProps, 'entityType' | 'consequences'>) => (
    <SoftDeleteModal
      {...props}
      entityType="Organization"
      consequences={[
        'Organization will be hidden from normal views',
        'Users won\'t be able to access the organization',
        'All organization data will be preserved',
        'Billing will be suspended',
        'Action can be reversed by restoring the organization'
      ]}
    />
  ),
  PermanentDelete: (props: Omit<PermanentDeleteModalProps, 'entityType' | 'consequences'>) => (
    <PermanentDeleteModal
      {...props}
      entityType="Organization"
      consequences={[
        'Organization will be completely removed',
        'All users in this organization will be deleted',
        'All organization data will be permanently lost',
        'All reports and files will be deleted',
        'Billing history will be removed',
        'This action cannot be reversed'
      ]}
    />
  ),
  Restore: (props: Omit<RestoreModalProps, 'entityType'>) => (
    <RestoreModal {...props} entityType="Organization" />
  )
};

export const ReportDeletionModals = {
  SoftDelete: (props: Omit<SoftDeleteModalProps, 'entityType' | 'consequences'>) => (
    <SoftDeleteModal
      {...props}
      entityType="Report"
      consequences={[
        'Report will be hidden from normal views',
        'File will be archived but preserved',
        'Download links will be disabled',
        'Action can be reversed by restoring the report'
      ]}
    />
  ),
  PermanentDelete: (props: Omit<PermanentDeleteModalProps, 'entityType' | 'consequences'>) => (
    <PermanentDeleteModal
      {...props}
      entityType="Report"
      consequences={[
        'Report record will be completely removed',
        'Associated file will be permanently deleted',
        'All metadata will be lost',
        'Storage space will be freed',
        'This action cannot be reversed'
      ]}
    />
  ),
  Restore: (props: Omit<RestoreModalProps, 'entityType'>) => (
    <RestoreModal {...props} entityType="Report" />
  )
};
