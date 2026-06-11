import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import { 
  ApiResponse, 
  CreateUserRequest, 
  UpdateUserRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  TierCreateRequest,
  TierUpdateRequest,
  PlanCreateRequest,
  PlanUpdateRequest,
  StripeProductVerificationResponse,
  PlanStripeSyncResponse,
  RateLimitConfigRequest,
  ActivationCodeRequest,
  EngineRequest,
  Auth0Settings,
  MfaFactorUpdateRequest,
  RoleMapping,
  RoleMappingListResponse,
  RoleMappingUpdateRequest,
  User
} from '@/types/api';
import toast from 'react-hot-toast';
import { clearClientSession } from '@/lib/clear-client-session';
import { AUTH_TOKEN_KEY } from '@/utils/auth-constants';
import { extractBackendErrorMessage } from '@/utils/error';

// Extend AxiosRequestConfig to include retry flag
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

interface ApiError {
  detail: string;
  status_code: number;
}

// Helper function to extract error message from various error response formats
const extractErrorMessage = extractBackendErrorMessage;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

function getAccessTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${AUTH_TOKEN_KEY}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

async function refreshSessionAccessToken(): Promise<string> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }

  const payload = await response.json();
  const token = payload?.data?.access_token as string | undefined;
  if (!token) {
    throw new Error('Session refresh failed');
  }
  return token;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clearSessionTokenGetter = () => {
  isRefreshing = false;
  refreshPromise = null;
  delete apiClient.defaults.headers.common['Authorization'];
};

apiClient.interceptors.request.use(
  async (config) => {
    const token = getAccessTokenFromCookie();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest?._retry
    ) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath === '/login' || currentPath.includes('/auth/')) {
        return Promise.reject(error);
      }

      if (originalRequest) {
        originalRequest._retry = true;
      }

      try {
        let newToken: string;
        if (isRefreshing && refreshPromise) {
          newToken = await refreshPromise;
        } else {
          isRefreshing = true;
          refreshPromise = refreshSessionAccessToken();
          newToken = await refreshPromise;
        }

        isRefreshing = false;
        refreshPromise = null;

        if (originalRequest) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return apiClient(originalRequest!);
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;
        toast.error('Session expired. Please log in again.');
        await clearClientSession();
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 authorization errors - check if it's an authentication issue
    if (error.response?.status === 403) {
      const errorDetail = error.response.data 
        ? extractErrorMessage(error.response.data) 
        : '';
      
      // If 403 indicates "Not authenticated", treat it like a 401
      if (errorDetail.toLowerCase().includes('not authenticated') || 
          errorDetail.toLowerCase().includes('authentication') ||
          errorDetail.toLowerCase().includes('access denied')) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (currentPath !== '/login' && !currentPath.includes('/auth/')) {
          toast.error('Authentication required. Please log in.');
          await clearClientSession();
          return Promise.reject(error);
        }
      }
    }

    // Handle authentication errors by redirecting to login (only if refresh wasn't attempted)
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath !== '/login' && !currentPath.includes('/auth/')) {
        toast.error('Authentication required. Please log in.');
        await clearClientSession();
        return Promise.reject(error);
      }
    }

    // Handle other errors (422, 400, 404, 500, etc.)
    if (error.response?.data) {
      try {
        const errorMessage = extractErrorMessage(error.response.data);
        const statusCode = error.response.status || 500;
        const apiError: ApiError = {
          detail: errorMessage,
          status_code: statusCode,
        };

        // Log error details in development for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('API Error:', {
            status: apiError.status_code,
            message: apiError.detail,
            rawData: error.response.data,
          });
        }

        // Show toast for all errors except 401 (401s are handled above with redirects)
        // 403s that reach here are not authentication-related (auth-related 403s return early above)
        if (statusCode !== 401) {
          toast.error(errorMessage);
        }

        return Promise.reject(apiError);
      } catch (extractError) {
        // If error extraction fails, provide a safe fallback
        console.error('Error extracting error message:', extractError, error.response.data);
        const statusCode = error.response.status || 500;
        const apiError: ApiError = {
          detail: 'An unexpected error occurred',
          status_code: statusCode,
        };

        // Show toast for unexpected errors (except auth errors)
        if (statusCode !== 401 && statusCode !== 403) {
          toast.error('An unexpected error occurred. Please try again.');
        }

        return Promise.reject(apiError);
      }
    }

    // Handle network errors or errors without response
    if (error.request) {
      const errorMessage = error.message || 'Network error. Please check your connection.';
      const apiError: ApiError = {
        detail: errorMessage,
        status_code: 0,
      };
      toast.error(errorMessage);
      return Promise.reject(apiError);
    }

    // Handle other unexpected errors
    const errorMessage = error.message || 'An unexpected error occurred';
    const apiError: ApiError = {
      detail: errorMessage,
      status_code: 500,
    };
    toast.error(errorMessage);
    return Promise.reject(apiError);
  }
);

// API helper functions
export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  },

  post: async <T>(url: string, data?: unknown, timeout?: number): Promise<T> => {
    // For FormData, remove Content-Type to let browser set multipart/form-data boundary
    const config: AxiosRequestConfig = data instanceof FormData ? {
      headers: { 'Content-Type': undefined }
    } : {};
    // Add custom timeout if provided
    if (timeout !== undefined) {
      config.timeout = timeout;
    }
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },

  put: async <T>(url: string, data?: unknown, timeout?: number): Promise<T> => {
    // For FormData, remove Content-Type to let browser set multipart/form-data boundary
    const config: AxiosRequestConfig = data instanceof FormData ? {
      headers: { 'Content-Type': undefined }
    } : {};
    // Add custom timeout if provided
    if (timeout !== undefined) {
      config.timeout = timeout;
    }
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },

  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.patch<ApiResponse<T>>(url, data);
    return response.data.data;
  },

  delete: async <T>(url: string): Promise<T> => {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data.data;
  },

  // Raw methods for when you need full response
  getRaw: async <T>(url: string, params?: Record<string, unknown>): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, { params });
  },

  postRaw: async <T>(url: string, data?: unknown): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data);
  },

  putRaw: async <T>(url: string, data?: unknown): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data);
  },

    deleteRaw: async <T>(url: string, data?: unknown): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, { data });
  },
};

// File upload helper
export const uploadFile = async (url: string, formData: FormData) => {
  return api.post(url, formData);
};

// Auth0 token will be added dynamically via the request interceptor

// Auth endpoints
export const authApi = {
  refreshToken: (data: { refresh_token: string }) =>
    api.post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', data),

  logout: () =>
    api.post<{ message: string }>('/api/auth/logout'),
};

// User endpoints  
export const userApi = {
  getMe: () =>
    api.get<User>('/api/users/me'),

  getMyUsage: () =>
    api.get<{ usage: Record<string, number> }>('/api/users/me/usage'),
};

// Super Admin API endpoints (/api/sa/)
export const superAdminApi = {
  // Dashboard Overview
  getDashboardOverview: () =>
    api.get('/api/sa/dashboard/overview'),

  getDashboardAnalytics: (params?: { days?: number }) =>
    api.get('/api/sa/dashboard/analytics', params),

  // User Management (moved to /oa/users)
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/oa/users', params),

  getUserById: (userId: number) =>
    api.get<User>(`/api/oa/users/${userId}`),

  createUser: (data: CreateUserRequest) =>
    api.post<User>('/api/oa/users', data),

  updateUser: (userId: number, data: UpdateUserRequest) =>
    api.put<User>(`/api/oa/users/${userId}`, data),

  deleteUser: (userId: number) =>
    api.delete<{ message: string }>(`/api/oa/user/${userId}/soft`),

  // Quota Management
  getQuotas: (params?: { page?: number; limit?: number }) =>
    api.get<{ quotas: unknown[] }>('/api/sa/quotas', params),

  updateQuota: (quotaId: number, data: { limit?: number; custom_limit?: number | null }) =>
    api.put<unknown>(`/api/sa/quotas/${quotaId}`, data),

  resetQuotas: (data: { organization_ids?: number[]; user_ids?: number[]; quota_type?: string }) =>
    api.post<{ message: string }>('/api/sa/quotas/reset', data),

  // Organization quota endpoints
  getOrganizationQuotas: (orgId: number) =>
    api.get(`/api/sa/org/${orgId}/quotas`),
  getUserQuotas: (userId: number) =>
    api.get(`/api/sa/user/${userId}/quotas`),
  getQuotaOverview: () =>
    api.get('/api/sa/quotas/overview'),
  syncQuotasWithTiers: () =>
    api.post('/api/sa/quotas/sync'),

  // New quota management endpoints
  getQuotaDetails: (params?: { page?: number; size?: number; search?: string; quota_type?: string; status?: string; org_id?: number }) =>
    api.get('/api/sa/quotas/details', params),
  getQuotaAnalytics: (params?: { quota_type?: string; org_id?: number }) =>
    api.get('/api/sa/quotas/analytics', params),

  // Organization-centric quota management
  getOrganizationsQuotaManagement: (params?: { page?: number; size?: number; search?: string; tier_id?: number; status?: string }) =>
    api.get('/api/sa/quotas/organizations', params),

  getOrganizationQuotaSummary: (orgId: number) =>
    api.get(`/api/sa/org/${orgId}/quotas`),



  // Custom Limits
  getCustomLimits: (params?: { page?: number; limit?: number }) =>
    api.get<{ limits: unknown[] }>('/api/sa/custom-limits', params),

  createCustomLimit: (data: { quota_type: string; custom_limit: number; organization_id?: number }) =>
    api.post<unknown>('/api/sa/custom-limits', data),

  updateCustomLimit: (limitId: number, data: { custom_limit?: number }) =>
    api.put<unknown>(`/api/sa/custom-limits/${limitId}`, data),

  deleteCustomLimit: (limitId: number) =>
    api.delete<{ message: string }>(`/api/sa/custom-limits/${limitId}`),

  // Organization Custom Limits
  getOrgCustomLimits: (orgId: number) =>
    api.get(`/api/sa/org/${orgId}/custom-limits`),

  setOrgCustomLimit: (orgId: number, data: { quota_type: string; custom_limit: number | null }) =>
    api.post(`/api/sa/org/${orgId}/custom-limit`, data),

  clearOrgCustomLimit: (orgId: number, quotaType: string) =>
    api.delete(`/api/sa/org/${orgId}/custom-limit/${quotaType}`),

  batchUpdateOrgCustomLimits: (orgId: number, data: { updates: Array<{ quota_type: string; custom_limit: number | null }> }) =>
    api.post(`/api/sa/org/${orgId}/custom-limits/batch`, data),

    // Rate Limiting
  getRateLimitConfigs: (params?: { page?: number; size?: number; is_active?: boolean }) =>
    api.get<{ configs: unknown[] }>('/api/sa/rate-limiting/configs', params),

  createRateLimitConfig: (data: RateLimitConfigRequest) =>
    api.post<unknown>('/api/sa/rate-limiting/configs', data),

  getRateLimitConfig: (configId: number) =>
    api.get<unknown>(`/api/sa/rate-limiting/configs/${configId}`),

  updateRateLimitConfig: (configId: number, data: Partial<RateLimitConfigRequest>) =>
    api.put<unknown>(`/api/sa/rate-limiting/configs/${configId}`, data),

  deleteRateLimitConfig: (configId: number) =>
    api.delete<{ message: string }>(`/api/sa/rate-limiting/configs/${configId}`),

  toggleRateLimitConfig: (configId: number) =>
    api.post(`/api/sa/rate-limiting/configs/${configId}/toggle`),

  getRateLimitLogs: (params?: { page?: number; size?: number; event_type?: string; client_ip?: string; days?: number }) =>
    api.get('/api/sa/rate-limiting/logs', params),

  getRateLimitStats: (params?: { days?: number }) =>
    api.get('/api/sa/rate-limiting/stats', params),

  // Soft Delete Management (Super Admin)
  getSoftDeletedItems: (params?: { entity_type?: string; page?: number; limit?: number }) =>
    api.get('/api/sa/soft-delete', params),

  restoreSoftDeleted: (data: { entity_type: string; entity_id: number }) =>
    api.post(`/api/pa/soft-delete/restore/${data.entity_type}/${data.entity_id}`),

  permanentDelete: async (data: { entity_type: string; entity_id: number; confirmation_text?: string }) => {
    const confirmationText = data.confirmation_text || `PERMANENTLY DELETE ${data.entity_type.toUpperCase()} ${data.entity_id}`;
    // Use deleteRaw since we need to pass data in the body for DELETE request
    const response = await api.deleteRaw(`/api/sa/soft-delete/permanent/${data.entity_type}/${data.entity_id}`, {
      confirmation_text: confirmationText
    });
    return response.data;
  },

  getConfirmationText: (entity_type: string, entity_id: number) =>
    api.get(`/api/sa/soft-delete/confirmation-text/${entity_type}/${entity_id}`),

  // Tier Management
  getTiersAdmin: (params?: {
    search?: string;
  }) =>
    api.get<{ tiers: unknown[] }>('/api/sa/tiers', params),

  getTierAdmin: (tierId: number) =>
    api.get<unknown>(`/api/sa/tiers/${tierId}`),

  createTier: (data: TierCreateRequest) =>
    api.post<unknown>('/api/sa/tiers', data),

  updateTier: (tierId: number, data: TierUpdateRequest) =>
    api.put<unknown>(`/api/sa/tiers/${tierId}`, data),

  // Plan Management
  getPlansAdmin: (params?: {
    search?: string;
    tier_id?: number;
    is_active?: boolean;
    include_tier?: boolean;
  }) =>
    api.get<{ plans: unknown[] }>('/api/sa/plans', { ...params, include_tier: true }),

  getPlanAdmin: (planId: number) =>
    api.get<unknown>(`/api/sa/plans/${planId}`),

  createPlan: (data: PlanCreateRequest) =>
    api.post<unknown>('/api/sa/plans', data),

  updatePlan: (planId: number, data: PlanUpdateRequest) =>
    api.put<unknown>(`/api/sa/plans/${planId}`, data),

  verifyStripeProduct: (stripeProductId: string, excludePlanId?: number, market: 'world' | 'br' = 'world') =>
    api.get<StripeProductVerificationResponse>('/api/sa/plans/verify-stripe-product', {
      stripe_product_id: stripeProductId,
      market,
      ...(excludePlanId ? { exclude_plan_id: excludePlanId } : {}),
    }),

  syncPlansWithStripe: () =>
    api.post<PlanStripeSyncResponse>('/api/sa/plans/sync-stripe'),

  deactivatePlan: (planId: number) =>
    api.patch<{ message: string }>(`/api/sa/plans/${planId}/deactivate`),

  activatePlan: (planId: number) =>
    api.patch<{ message: string }>(`/api/sa/plans/${planId}/activate`),

  // Auth0 Settings Management
  getAuth0Status: () =>
    api.get<Auth0Settings>('/api/sa/auth0/auth0-status'),

  getAuth0ConnectionStatus: () =>
    api.get<{ status: unknown }>('/api/sa/auth0/connection-status'),

  getMfaStatus: () =>
    api.get<{ factors: unknown[] }>('/api/sa/auth0/mfa-status'),

  updateMfaFactor: (data: MfaFactorUpdateRequest) =>
    api.put<{ message: string; enabled: boolean }>('/api/sa/auth0/mfa-factor', data),

  // Activation Codes
  getActivationCodes: (params?: { page?: number; per_page?: number; status?: string }) =>
    api.get<{ codes: unknown[] }>('/api/sa/activation-codes/list', { params }),

  createActivationCode: (data: ActivationCodeRequest) =>
    api.post<unknown>('/api/sa/activation-codes/create', data),

  updateActivationCode: (id: number, data: Partial<ActivationCodeRequest>) =>
    api.put<unknown>(`/api/sa/activation-codes/${id}`, data),

  deleteActivationCode: (id: number) =>
    api.delete<{ message: string }>(`/api/sa/activation-codes/${id}`),

  getActivationCodeOrgUsers: (orgId: number) =>
    api.get<{
      users: import('@/types/api').OrgUserRecipientOption[];
      default_recipient_user_id: number | null;
    }>(`/api/sa/activation-codes/org/${orgId}/users`),

};

// System API endpoints (/api/system/)
export const systemApi = {
  // Health endpoints
  getHealth: (params?: { lang?: string }) =>
    api.get('/api/system/health', params),

  getSimpleHealth: () =>
    api.get('/api/system/health/simple'),

  // System information
  getRoles: () =>
    api.get('/api/system/roles'),

  getTiers: () =>
    api.get('/api/system/tiers'),

  getQuotaTypes: () =>
    api.get('/api/system/quota-types'),

  getLanguages: () =>
    api.get('/api/system/languages'),

  getSystemInfo: () =>
    api.get('/api/system/info'),

  // Maintenance
  getMaintenanceStatus: () =>
    api.get('/api/system/maintenance'),
};

// Platform Admin API endpoints (/api/pa/)
export const platformAdminApi = {
  // Organizations
  getOrganizations: (params?: { page?: number; limit?: number; search?: string; include_deleted?: boolean; skip?: number }) =>
    api.get('/api/pa/orgs', params),

  getOrganizationDetails: (orgId: number) =>
    api.get<unknown>(`/api/pa/orgs/${orgId}`),

  createOrganization: (data: CreateOrganizationRequest) =>
    api.post<unknown>('/api/pa/orgs', data),

  updateOrganization: (orgId: number, data: UpdateOrganizationRequest) =>
    api.put<unknown>(`/api/pa/orgs/${orgId}`, data),

  deleteOrganization: (orgId: number) =>
    api.delete<{ message: string }>(`/api/pa/orgs/${orgId}`),

  softDeleteOrganization: (orgId: number) =>
    api.delete(`/api/pa/orgs/${orgId}/soft`),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string; org_id?: string; filter_org_id?: string; include_deleted?: boolean }) =>
    api.get('/api/oa/users', params),

  softDeleteUser: (userId: number) =>
    api.delete(`/api/oa/user/${userId}/soft`),

  restoreUser: (userId: number) =>
    api.post(`/api/oa/user/${userId}/restore`),

  // Processing Tasks (using getRaw to preserve metadata)
  getProcessingTasks: async (params?: { skip?: number; limit?: number; status?: string }) => {
    const response = await api.getRaw('/api/processing-tasks', params);
    return response.data; // This preserves both data and metadata
  },

  downloadProcessingTaskResult: async (taskId: string, fileType: 'json' | 'html' | 'pdf' | 'excel') => {
    const response = await apiClient.get(`/api/processing-tasks/${taskId}/download/${fileType}`, {
      responseType: 'blob',
    });
    return response;
  },

  /** Permanently delete a processing task. Pass the task's `task_id` (UUID string), not the numeric `id`. */
  deleteProcessingTask: (taskId: string) =>
    api.delete(`/api/processing-tasks/${taskId}`),

  // Soft Delete Operations (Platform Admin)
  restoreSoftDeleted: (data: { entity_type: string; entity_id: number }) =>
    api.post(`/api/pa/soft-delete/restore/${data.entity_type}/${data.entity_id}`),

  listSoftDeleted: (entity_type: string, params?: { org_id?: number; limit?: number; offset?: number; recently_deleted_days?: number }) =>
    api.get(`/api/pa/soft-delete/deleted/${entity_type}`, params),

  getSoftDeleteStats: () =>
    api.get('/api/pa/soft-delete/stats'),

  // Users (continued methods)
  getUserById: (userId: number) =>
    api.get<User>(`/api/oa/users/${userId}`),

  createUser: (data: CreateUserRequest) =>
    api.post<User>('/api/oa/users', data),

  updateUser: (userId: number, data: UpdateUserRequest) =>
    api.put<User>(`/api/oa/users/${userId}`, data),

  suspendUser: (userId: number) =>
    api.post(`/api/oa/user/${userId}/suspend`),

  reactivateUser: (userId: number) =>
    api.post(`/api/oa/user/${userId}/reactivate`),

  // Audit Logs (using getRaw to preserve metadata)
  getAuditLogs: async (params?: {
    skip?: number;
    limit?: number;
    org_id?: number;
    actor_id?: number;
    days?: number;
    search?: string;
    actor_name?: string;
    org_name?: string;
  }) => {
    const response = await api.getRaw('/api/audit/audit_logs', params);
    return response.data; // This preserves both data and metadata
  },

  // Maintenance
  getMaintenanceStatus: () =>
    api.get('/api/pa/maintenance/status'),

  enablePlatformMaintenance: (data: { message: string; scheduled_end: string }) =>
    api.post('/api/pa/maintenance/platform/enable', data),

  disablePlatformMaintenance: () =>
    api.post('/api/pa/maintenance/platform/disable', {}),

  enableOrganizationMaintenance: (data: { organization_id: number; message: string; scheduled_end: string }) =>
    api.post(`/api/oa/maintenance/${data.organization_id}/enable`, {
      message: data.message,
      scheduled_end: data.scheduled_end
    }),

  disableOrganizationMaintenance: (orgId: number) =>
    api.post(`/api/oa/maintenance/${orgId}/disable`, {}),

  getMaintenanceHistory: (params?: { maintenance_type?: 'platform' | 'organization'; target_id?: number; skip?: number; limit?: number }) =>
    api.get('/api/pa/maintenance/history', params),

  getOrganizationMaintenanceHistory: (orgId: number, params?: { skip?: number; limit?: number }) =>
    api.get(`/api/oa/maintenance/${orgId}/history`, params),

  // Impersonation
  getImpersonationHistory: (params?: { skip?: number; limit?: number; admin_id?: number }) =>
    api.get('/api/pa/impersonation/history', params),

  getImpersonationStatus: () =>
    api.get('/api/pa/impersonation/status'),

  startImpersonation: (data: { user_id: number }) =>
    api.post('/api/pa/impersonation/start', data),

  endImpersonation: () =>
    api.post('/api/pa/impersonation/end'),

  // Organization Actions
  setOrganizationTier: (orgId: number, data: { tier: string }) =>
    api.post(`/api/pa/org/${orgId}/tier`, data),

  removeOrganizationTier: (orgId: number) =>
    api.delete(`/api/pa/org/${orgId}/tier`),

  getFreeTrialOrganizations: async (params?: { skip?: number; limit?: number; search?: string }) => {
    const response = await api.getRaw('/api/pa/orgs/free-trials', params);
    return response.data; 
  },

  expireFreeTrial: (orgId: number) =>
    api.post<{ message: string }>(`/api/pa/orgs/${orgId}/free-trial/expire`),

  updateFreeTrialExpiration: (orgId: number, expirationDate: string) =>
    api.put<{ message: string }>(`/api/pa/orgs/${orgId}/free-trial/expiration?expiration_date=${expirationDate}`),

  suspendOrganization: (orgId: number) =>
    api.post(`/api/pa/orgs/${orgId}/suspend`),

  reactivateOrganization: (orgId: number) =>
    api.post(`/api/pa/orgs/${orgId}/reactivate`),

  // Law Packs Management
  getLawPacks: (params?: { active?: boolean }) =>
    api.get('/api/pa/lawpacks', params),

  getLawPack: (id: number) =>
    api.get(`/api/pa/lawpack/${id}`),

  createLawPack: (formData: FormData) =>
    api.post('/api/pa/lawpack', formData, 300000), // 5 minutes

  generatePresignedUploadUrls: (data: { filenames: string[]; content_types?: string[] }) =>
    api.post<{ upload_urls: Array<{ url: string; s3_key: string; filename: string; expires_in_seconds: number }> }>('/api/pa/lawpack/presigned-urls', data),

  createLawPackFromUrls: (data: {
    name?: string;
    jurisdiction: string;
    version: string;
    launch_date: string;
    status: string;
    files: Array<{ s3_key: string; original_filename: string; order_index: number }>;
    badge?: string;
    tags?: string;
    type?: string;
    supported_language?: 'en' | 'pt' | 'both';
    region?: string;
    description?: string;
    /** Bilingual content: keys "en" and/or "pt". When provided, at least one language required; name/badge/description/tags/region/type at top level are ignored for that language. */
    content?: {
      en?: { name: string; badge?: string; description?: string; tags?: string; region?: string; type?: string };
      pt?: { name: string; badge?: string; description?: string; tags?: string; region?: string; type?: string };
    };
  }) =>
    api.post('/api/pa/lawpack/from-urls', data),

  updateLawPack: async (id: number, formData: FormData) =>
    api.put(`/api/pa/lawpack/${id}`, formData, 300000), // 5 minutes

  downloadLawPack: (id: number) =>
    api.get(`/api/pa/lawpack/${id}/download`),

  assignLawPack: (orgId: number, lawPackId: number) =>
    api.post(`/api/pa/org/${orgId}/lawpack`, { law_pack_id: lawPackId }),

  unassignLawPack: (orgId: number, lawPackId: number) =>
    api.delete(`/api/pa/org/${orgId}/lawpack/${lawPackId}`),

  // Organization Assignments Management
  getOrganizationAssignments: (params?: { skip?: number; limit?: number }) =>
    api.get('/api/pa/organizations/assignments', params),

  /** Sync organization law packs in one request. Send only selected law pack IDs; backend assigns new and unassigns removed. */
  syncOrganizationLawPacks: (orgId: number, lawPackIds: number[]) =>
    api.put<{ message: string }>(`/api/pa/organizations/${orgId}/lawpacks`, { law_pack_ids: lawPackIds }),

  assignLawPackWithValidation: (orgId: number, data: { law_pack_id: number }) =>
    api.post(`/api/pa/organizations/${orgId}/assign-lawpack`, data),

  unassignLawPackWithValidation: (orgId: number, lawPackId: number) =>
    api.delete(`/api/pa/organizations/${orgId}/unassign-lawpack/${lawPackId}`),

  // Support Ticket Management (Platform Admin)
  getAllSupportTickets: (params?: { status?: string; category?: string; org_id?: number; limit?: number; offset?: number }) =>
    api.get<{ tickets: unknown[] }>('/api/pa/support-tickets/support-tickets', params),
  getSupportTicket: (ticketId: number) =>
    api.get<unknown>(`/api/pa/support-tickets/support-ticket/${ticketId}`),
  updateSupportTicketStatus: (ticketId: number, status: string) =>
    api.patch<{ message: string }>(`/api/pa/support-tickets/support-ticket/${ticketId}/status?status=${status}`, {}),

  // Role Mapping Management
  getRoleMappings: () =>
    api.get<RoleMappingListResponse>(`/api/pa/role-mappings`),
  getRoleMapping: (mappingId: number) =>
    api.get<RoleMapping>(`/api/pa/role-mappings/${mappingId}`),
  updateRoleMapping: (mappingId: number, mappingData: RoleMappingUpdateRequest) =>
    api.put<RoleMapping>(`/api/pa/role-mappings/${mappingId}`, mappingData),

  // Engines management
  getEngines: (params?: string) =>
    api.get<{ engines: unknown[] }>(`/api/pa/engines${params ? `?${params}` : ''}`),
  createEngine: (engineData: EngineRequest) =>
    api.post<unknown>('/api/pa/engines/', engineData),
  getEngine: (engineId: number) =>
    api.get<unknown>(`/api/pa/engines/${engineId}`),
  updateEngine: (engineId: number, engineData: Partial<EngineRequest>) =>
    api.put<unknown>(`/api/pa/engines/${engineId}`, engineData),
  deleteEngine: (engineId: number) =>
    api.delete<{ message: string }>(`/api/pa/engines/${engineId}`),
  getUnassignedLawPacks: () =>
    api.get<{ law_packs: Array<{ id: number; name: string; jurisdiction: string; version: string; description?: string; badge?: string; tags?: string[]; status: string; is_assigned_to_this_engine: boolean; is_assigned_to_other_engine: boolean }> }>(`/api/pa/engines/unassigned-lawpacks`),
  getAssignableLawPacks: (engineId: number) =>
    api.get<{ law_packs: Array<{ id: number; name: string; jurisdiction: string; version: string; description?: string; badge?: string; tags?: string[]; status: string; is_assigned_to_this_engine: boolean; is_assigned_to_other_engine: boolean }> }>(`/api/pa/engines/${engineId}/assignable-lawpacks`),
  manageEngineLawPacks: (engineId: number, lawPackIds: number[]) =>
    api.put<{ assigned_law_packs: number[]; unassigned_law_packs: number[]; failed_assignments: number[]; failed_unassignments: number[] }>(`/api/pa/engines/${engineId}/lawpacks`, { law_pack_ids: lawPackIds }),
  /** Check all engines' health in one request. No engine ID. */
  checkAllEnginesHealth: () =>
    api.post<{ results: Array<{ engine_id: number; status: string; response_time?: number; last_check: string; error_message?: string }> }>('/api/pa/engines/health-check'),

  checkEngineHealth: (engineId: number) =>
    api.post<{ status: unknown }>(`/api/pa/engines/${engineId}/health-check`),

  /** Org-admin: send a password reset link to a user within their organization. */
  sendPasswordReset: (userId: number) =>
    api.post<{ message: string }>('/api/oa/password-reset', { user_id: userId }),

  /** Super-admin: send a password reset link to any user. */
  superAdminSendPasswordReset: (userId: number) =>
    api.post<{ message: string }>('/api/sa/password-reset', { user_id: userId }),
};
