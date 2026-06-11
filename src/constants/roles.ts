import { UserRole } from '@/types/api';

/**
 * Backend role definitions with display labels and color classes
 */
export const BACKEND_ROLES = [
  { 
    value: 'super_admin', 
    label: 'Super Admin', 
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
  },
  { 
    value: 'platform_admin', 
    label: 'Platform Admin', 
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' 
  },
  { 
    value: 'org_admin', 
    label: 'Organization Admin', 
    colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
  },
  { 
    value: 'member', 
    label: 'Member', 
    colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' 
  },
  { 
    value: 'read_only', 
    label: 'Read Only', 
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300' 
  },
] as const;

/**
 * User roles for forms and filters
 */
export const USER_ROLES = [
  { value: UserRole.SUPER_ADMIN, label: 'Super Admin' },
  { value: UserRole.PLATFORM_ADMIN, label: 'Platform Admin' },
  { value: UserRole.ORG_ADMIN, label: 'Organization Admin' },
  { value: UserRole.MEMBER, label: 'Member' },
  { value: UserRole.READ_ONLY, label: 'Read Only' },
] as const;

/**
 * User roles with "All Roles" option for filters
 */
export const USER_ROLES_WITH_ALL = [
  { value: '', label: 'All Roles' },
  ...USER_ROLES,
] as const;

/**
 * Role color mapping for badges
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-purple-100 text-purple-800',
  [UserRole.PLATFORM_ADMIN]: 'bg-blue-100 text-blue-800',
  [UserRole.ORG_ADMIN]: 'bg-green-100 text-green-800',
  [UserRole.MEMBER]: 'bg-yellow-100 text-yellow-800',
  [UserRole.READ_ONLY]: 'bg-gray-100 text-gray-800',
};

/**
 * Get the color class for a backend role
 */
export function getBackendRoleColor(role: string): string {
  const roleData = BACKEND_ROLES.find(r => r.value === role);
  return roleData?.colorClass || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
}

/**
 * Get the label for a backend role
 */
export function getBackendRoleLabel(role: string): string {
  const roleData = BACKEND_ROLES.find(r => r.value === role);
  return roleData?.label || role;
}

/**
 * Get the color class for a user role
 */
export function getUserRoleColor(role: UserRole): string {
  return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Get the label for a user role
 */
export function getUserRoleLabel(role: UserRole): string {
  const roleData = USER_ROLES.find(r => r.value === role);
  return roleData?.label || role;
}

