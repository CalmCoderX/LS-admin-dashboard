'use client';

import { useState } from 'react';
import { User, UserRole } from '@/types/api';
import { ROLE_COLORS } from '@/constants/roles';
import { getUserStatusBadge } from '@/constants/badges';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  Ban,
  CheckCircle,
  Trash2,
  Edit,
  RefreshCw,
  User as UserIcon,
  PhoneIcon,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { TableSkeleton } from './SkeletonLoader';

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  showOrganization?: boolean;
  showActions?: boolean;
  showLastAction?: boolean;
  onEdit?: (user: User) => void;
  onSuspend?: (userId: number) => void;
  onReactivate?: (userId: number) => void;
  onDelete?: (user: User) => void;
  onRestore?: (user: User) => void;
  onPasswordReset?: (userId: number) => void;
  isSuspending?: boolean;
  isReactivating?: boolean;
  isDeleting?: boolean;
  isRestoring?: boolean;
  isSendingReset?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

export default function UserTable({
  users,
  isLoading = false,
  showOrganization = true,
  showActions = true,
  showLastAction = true,
  onEdit,
  onSuspend,
  onReactivate,
  onDelete,
  onRestore,
  onPasswordReset,
  isSuspending = false,
  isReactivating = false,
  isDeleting = false,
  isRestoring = false,
  isSendingReset = false,
  emptyMessage = 'No users found',
  emptyDescription,
}: UserTableProps) {
  const getRoleBadge = (role: UserRole) => {
    return (
      <span className={`flex justify-center text-center px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getLastAction = (user: User) => {
    if (!user.last_action || !user.last_action_by || !user.last_action_at) {
      return (
        <span className="text-text-secondary text-sm">—</span>
      );
    }

    const actionColors = {
      suspended: 'text-orange-600',
      reactivated: 'text-green-600',
      deleted: 'text-red-600',
      restored: 'text-blue-600',
    };

    return (
      <div className="text-sm">
        <div className={`font-medium ${actionColors[user.last_action as keyof typeof actionColors] || 'text-text-primary'}`}>
          {user.last_action.charAt(0).toUpperCase() + user.last_action.slice(1)}
        </div>
        <div className="text-text-secondary">
          by {user.last_action_by}
        </div>
        <div className="text-text-secondary text-xs">
          {format(new Date(user.last_action_at), 'MMM dd, yyyy')}
        </div>
      </div>
    );
  };

  const getColumnCount = () => {
    let count = 3; // User, Role, Status are always shown
    if (showOrganization) count++;
    if (showLastAction) count++;
    count++; // Last Login is always shown
    if (showActions) count++;
    return count;
  };

  if (isLoading) {
    return <TableSkeleton rows={10} columns={getColumnCount()} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            <th className="px-6 py-3 text-left">User</th>
            <th className="px-6 py-3 text-left">Role</th>
            <th className="px-6 py-3 text-left">Status</th>
            {showOrganization && (
              <th className="px-6 py-3 text-left">Organization</th>
            )}
            {showLastAction && (
              <th className="px-6 py-3 text-left">Last Action</th>
            )}
            <th className="px-6 py-3 text-left">Last Login</th>
            {showActions && (
              <th className="px-6 py-3 text-left">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6 dark:divide-gray-600">
          {users.length === 0 ? (
            <tr>
              <td colSpan={getColumnCount()} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {emptyMessage}
                    </h3>
                    {emptyDescription && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {emptyDescription}
                      </p>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className={clsx(
                'table-row',
                user.deleted_at && 'opacity-60 bg-gray-50 dark:bg-gray-900/50'
              )}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-brand-navy rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <p className={clsx(
                          "text-sm font-medium",
                          user.deleted_at ? "text-gray-500 dark:text-gray-400 line-through" : "text-text-primary"
                        )}>
                          {user.name || 'No name'}
                        </p>
                        {user.deleted_at && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                            Deleted
                          </span>
                        )}
                      </div>
                      <p className={clsx(
                        "text-sm",
                        user.deleted_at ? "text-gray-400 dark:text-gray-500" : "text-text-secondary"
                      )}>{user.email}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                        {user.phone_number && (
                          <span className="inline-flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3 text-gray-400" />
                            {user.phone_number}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                          {user.preferred_language === 'en' || user.preferred_language === null || user.preferred_language === undefined ? 'English' : user.preferred_language === 'pt' ? 'Português' : user.preferred_language.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4">
                  {getUserStatusBadge(user)}
                </td>
                {showOrganization && (
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {user.organization?.name || '—'}
                  </td>
                )}
                {showLastAction && (
                  <td className="px-6 py-4">
                    {getLastAction(user)}
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {user.last_login ? format(new Date(user.last_login), 'MMM dd, yyyy') : 'Never'}
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(user)}
                          className="p-1 text-text-secondary hover:text-brand-navy transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onPasswordReset && !user.deleted_at && (
                        <button
                          onClick={() => onPasswordReset(user.id)}
                          disabled={isSendingReset}
                          className="p-1 text-text-secondary hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send password reset email"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      {user.is_active && !user.deleted_at && onSuspend && (
                        <button
                          onClick={() => onSuspend(user.id)}
                          disabled={isSuspending}
                          className="p-1 text-status-warning hover:text-status-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Suspend user"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {!user.is_active && !user.deleted_at && onReactivate && (
                        <button
                          onClick={() => onReactivate(user.id)}
                          disabled={isReactivating}
                          className="p-1 text-status-success hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reactivate user"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {user.deleted_at ? (
                        <>
                          {onRestore && (
                            <button
                              onClick={() => onRestore(user)}
                              disabled={isRestoring}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Restore user"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(user)}
                              disabled={isDeleting}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Permanently delete"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        onDelete && (
                          <button
                            onClick={() => onDelete(user)}
                            disabled={isDeleting}
                            className="p-1 text-text-secondary hover:text-status-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

