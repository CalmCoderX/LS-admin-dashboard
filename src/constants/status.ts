/**
 * Status options for different entities across the application
 */

// User status options for filters
export const USER_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'invitation_sent', label: 'Invitation sent' },
  { value: 'inactive', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
] as const;

// Organization status options for filters
export const ORGANIZATION_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
] as const;

// Subscription status options for filters
export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: '', label: 'All Subscriptions' },
  { value: 'active', label: 'Active' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'trialing', label: 'Trial' },
] as const;

// Quota status options for filters
export const QUOTA_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'healthy', label: 'Healthy (<80%)' },
  { value: 'warning', label: 'Warning (80-95%)' },
  { value: 'critical', label: 'Critical (>95%)' },
  { value: 'exceeded', label: 'Exceeded' },
] as const;

// Law Pack status options for filters
export const LAW_PACK_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
  { value: 'pending', label: 'Pending Review' },
] as const;

// Report/Task status options for filters
export const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const;

// Tier options for filters
export const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

