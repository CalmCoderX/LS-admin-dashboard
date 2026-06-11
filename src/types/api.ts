// Base API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success?: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  metadata: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SuccessMessageResponse {
  message: string;
  success: boolean;
}

// Maintenance Error Types
export interface MaintenanceErrorDetails {
  maintenance_type: 'platform' | 'organization';
  maintenance_message?: string | null;
  estimated_completion?: string | null;
  status_endpoint: string;
}

export interface MaintenanceErrorResponse {
  success: false;
  message: string;
  error: {
    code: 'MAINTENANCE_MODE' | 'MAINTENANCE_WRITE_BLOCKED' | 'WRITE_BLOCKED';
    details: MaintenanceErrorDetails;
  };
}

// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  phone_number?: string | null;
  preferred_language?: string | null;
  role: UserRole;
  is_active: boolean;
  organization: Organization;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  last_login?: string | null;
  account_status?: 'active' | 'suspended' | 'invitation_sent' | 'deleted';
  impersonation_started_at?: string | null;

  // Last action information (calculated on backend)
  last_action?: string | null;
  last_action_by?: string | null;
  last_action_at?: string | null;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  ORG_ADMIN = 'org_admin',
  MEMBER = 'member',
  READ_ONLY = 'read_only',
}

export interface UserListResponse {
  users: User[];
}

export interface UserStatsResponse {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
  admins: number;
}

// Organization Types
export interface Organization {
  id: number;
  name: string;
  tier?: Tier | null;
  tier_id?: number | null;
  subscription_status?: string;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL' | null;
  credential_login_enabled?: boolean;
  credential_registration_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface OrganizationListItem {
  id: number;
  name: string;
  tier: string | null;
  tier_id?: number | null;
  subscription_status?: string | null;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL' | null;
  credential_login_enabled?: boolean | null;
  credential_registration_enabled?: boolean | null;
  user_count?: number | null;
  user_growth?: number | null;
  last_activity?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  is_active?: boolean | null;
  suspended_at?: string | null;
  suspended_by?: number | null;
  reactivated_at?: string | null;
  reactivated_by?: number | null;
  free_tier_expires_at?: string | null;
  is_standalone?: boolean | null;
}

export interface CreateOrganizationRequest {
  name: string;
  tier_id?: number | null;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL';
  credential_login_enabled?: boolean;
  credential_registration_enabled?: boolean;
}

export interface UpdateOrganizationRequest {
  name?: string;
  tier_id?: number | null;
  service_type?: string;
  billing_location?: 'WORLD' | 'BRAZIL';
  credential_login_enabled?: boolean;
  credential_registration_enabled?: boolean;
}

export interface OrganizationListResponse {
  organizations: OrganizationListItem[];
}

// Organization Detail API Response (what the API actually returns)
export interface OrganizationDetailApiResponse {
  id: number;
  name: string;
  tier?: string | null;
  tier_id?: number | null;
  subscription_status?: string | null;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL' | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  is_active?: boolean;
  suspended_at?: string | null;
  suspended_by?: number | null;
  reactivated_at?: string | null;
  reactivated_by?: number | null;
  user_count?: number;
  active_users_count?: number;
  user_growth?: number;
  last_activity?: string | null;
}

// Maintenance Types
export interface MaintenanceInfo {
  active: boolean;
  message?: string | null;
  enabled_at?: string | null;
  scheduled_end: string;
  enabled_by_email?: string | null;
}

export interface MaintenanceOperationResponse {
  success: boolean;
  maintenance_info: MaintenanceInfo;
  message: string;
}

export interface MaintenanceHistoryResponse {
  history: MaintenanceHistoryEntry[];
  total_records: number;
}

export interface MaintenanceHistoryEntry {
  id: number;
  type: 'platform' | 'organization';
  target_id?: number | null;
  target_name?: string | null;
  message?: string | null;
  enabled_by: number;
  enabled_by_email?: string | null;
  enabled_at: string;
  disabled_by?: number | null;
  disabled_by_email?: string | null;
  disabled_at?: string | null;
  scheduled_end: string;
  active: boolean; // Whether maintenance is currently active (considers both disabled_at and scheduled_end)
}

export interface AdminMaintenanceStatusData {
  platform_maintenances: MaintenanceHistoryEntry[];
  organization_maintenances: MaintenanceHistoryEntry[];
}

// System/Maintenance API Response Types (wrapped in AxiosResponse)
export interface MaintenanceStatusApiResponse {
  data: {
    success: boolean;
    message: string;
    data: {
      platform_maintenance: MaintenanceInfo;
      organization_maintenance?: MaintenanceInfo | null;
    };
  };
}

export interface MaintenanceHistoryApiResponse {
  data: {
    success: boolean;
    message: string;
    data: {
      history: MaintenanceHistoryEntry[];
      total_records: number;
    };
  };
}

export interface AdminMaintenanceStatusApiResponse {
  data: {
    success: boolean;
    message: string;
    data: AdminMaintenanceStatusData;
  };
}

// Impersonation Types
export interface ImpersonationSession {
  admin_user_id: number;
  admin_user_email: string;
  impersonated_user_id: number;
  impersonated_user_email: string;
  session_id: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface ImpersonationHistoryEntry {
  id: number;
  action: string;
  admin_user_id: number;
  admin_user_email: string;
  impersonated_user_id: number;
  impersonated_user_email: string;
  timestamp: string;
  session_id: string;
}

// Impersonation API Response Types (wrapped in AxiosResponse)
export interface ImpersonationStatusApiResponse {
  data: {
    success: boolean;
    message: string;
    data: {
      is_impersonating: boolean;
      session?: ImpersonationSession | null;
    };
  };
}

export interface ImpersonationHistoryApiResponse {
  data: {
    success: boolean;
    message: string;
    data: {
      history: ImpersonationHistoryEntry[];
      total_sessions: number;
    };
  };
}

// Audit Log Types
export interface AuditLogEntry {
  id: number;
  action: string;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  org_id?: number | null;
  org_name?: string | null;
  timestamp: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string | null;
  device?: string | null;
  city_name?: string | null;
  country_name?: string | null;
  sha256_hash?: string | null;
}

// Audit Logs API Response Types (actual structure from API)
export interface AuditLogsApiResponse {
  audit_logs: AuditLogEntry[];
  metadata?: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Users API Response Types (actual structure from API)
export interface UsersApiResponse {
  users: User[];
  metadata?: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Quota Types
export interface QuotaInfo {
  quota_type: string;
  limit: number;
  used: number;
  remaining?: number;
  usage_percent: number;
  period: string;
  last_reset?: string | null;
  custom_limit?: number | null;
  tier_limit: number;
  has_custom_limit?: boolean;
  status?: string;
  effective_limit?: number; // For modal compatibility
}

// Quotas API Response Types (actual structure from API)
export interface QuotasApiResponse {
  quotas: QuotaInfo[];
  exceeded_quotas?: number;
  near_limit_quotas?: number;
  total_quotas?: number;
  organization_id?: number;
  organization_name?: string;
  tier_name?: string;
  tier_slug?: string;
  last_sync?: string;
  quota_by_type?: Record<string, {
    total: number;
    exceeded: number;
    near_limit: number;
    average_usage_percent: number;
    total_used: number;
    total_limit: number;
    exceeded_organizations?: ExceededOrganization[];
  }>;
}

// Activation Code Types
export interface ActivationCode {
  id: number;
  code: string;
  description: string | null;
  is_active: boolean;
  is_expired: boolean;
  is_usable: boolean;
  is_used: boolean;
  expires_at: string | null;
  tier_id: number | null;
  tier: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  created_by: number;
  created_at: string;
  used_by: number | null;
  used_at: string | null;
  organization_id: number;
  organization_name: string;
  organization_tier_name: string;
  recipient_user_id?: number | null;
  recipient_email?: string | null;
  recipient_name?: string | null;
  registration_role?: string | null;
}

export interface OrgUserRecipientOption {
  id: number;
  email: string;
  name: string | null;
  role: string;
  is_org_admin: boolean;
}

export interface ActivationCodeListData {
  codes: ActivationCode[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Activation Codes API Response Types (wrapped in AxiosResponse by getRaw)
// Structure: { data: { success, message, data: ActivationCodeListData } }
export interface ActivationCodesApiResponse {
  data: {
    success: boolean;
    message: string;
    data: ActivationCodeListData;
  };
}

// Tier Types
export interface Tier {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price?: number;
}

export interface TiersApiResponse {
  tiers: Tier[];
}

// Processing Task Types
export interface ProcessingTask {
  id: number;
  task_id: string;  // UUID
  title: string;
  status: string;  // pending, processing, completed, failed, cancelled
  progress_percent: number;
  status_message?: string | null;
  input_type: string;  // "query" or "file"
  input_query?: string | null;
  input_file_name?: string | null;
  engine_name?: string | null;
  law_pack_name?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  processing_time_seconds?: number | null;
  error_message?: string | null;
  result_json_path?: string | null;
  result_html_path?: string | null;
  result_pdf_path?: string | null;
  result_excel_path?: string | null;
  result_metadata?: Record<string, any> | null;
}

export interface ProcessingTaskListData {
  tasks: ProcessingTask[];
}

// Processing Task API Response Types (wrapped in AxiosResponse and PaginatedResponse)
export interface ProcessingTasksApiResponse {
  success: boolean;
  message: string;
  data: ProcessingTaskListData;
  metadata: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Error Response Types
export interface ApiErrorResponse {
  detail?: string;
  error?: {
    details?: string;
    message?: string;
  };
  message?: string;
}

// Tier Management Types (for Admin)
export interface TierAdmin {
  id: number;
  name: string;
  slug: string;
  description?: string;
  max_users: number;
  max_laws: string; // Can be number or "-1" for unlimited
  api_calls_limit: number;
  reports_limit: number;
  word_limit_per_submission: number;
  law_change_cooldown_days?: number | null;
  custom_branding: boolean;
  sort_order: number;
  additional_config: Record<string, any>;
  plan_count: number; // Number of plans associated with this tier
  created_at: string;
  updated_at: string;
}

export interface TierCreateRequest {
  name: string;
  slug: string;
  description?: string;
  max_users: number;
  max_laws: string;
  api_calls_limit: number;
  reports_limit: number;
  word_limit_per_submission: number;
  law_change_cooldown_days?: number | null;
  custom_branding: boolean;
  sort_order: number;
}

export interface TierUpdateRequest {
  name?: string;
  slug?: string;
  description?: string;
  max_users?: number;
  max_laws?: string;
  api_calls_limit?: number;
  reports_limit?: number;
  word_limit_per_submission?: number;
  law_change_cooldown_days?: number | null;
  custom_branding?: boolean;
  sort_order?: number;
}

export interface TierResponse extends TierAdmin {}

export interface TierWithPlansResponse extends TierAdmin {
  plans: Array<{
    id: number;
    name: string;
    description?: string;
    amount: number;
    currency: string;
    interval: string;
    interval_count: number;
    is_active: boolean;
    is_featured: boolean;
  }>;
}

// Plan Types
export interface PlanAdmin {
  id: number;
  name: string;
  description?: string;
  name_brl?: string | null;
  description_brl?: string | null;
  amount: number;
  amount_brl?: number | null;
  interval: string;
  interval_count: number;
  interval_brl?: string | null;
  interval_count_brl?: number | null;
  stripe_product_id: string;
  stripe_product_id_brl?: string | null;
  stripe_price_id: string;
  stripe_price_id_brl?: string | null;
  tier_id: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanCreateRequest {
  name: string;
  description?: string;
  name_brl?: string | null;
  description_brl?: string | null;
  amount: number;
  amount_brl?: number | null;
  interval: string;
  interval_count: number;
  interval_brl?: string | null;
  interval_count_brl?: number | null;
  stripe_product_id: string;
  stripe_product_id_brl?: string;
  stripe_price_id: string;
  stripe_price_id_brl?: string;
  tier_id: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface PlanUpdateRequest {
  name?: string;
  description?: string;
  name_brl?: string | null;
  description_brl?: string | null;
  amount?: number;
  amount_brl?: number | null;
  interval_brl?: string | null;
  interval_count_brl?: number | null;
  stripe_product_id?: string;
  stripe_product_id_brl?: string | null;
  stripe_price_id?: string;
  stripe_price_id_brl?: string | null;
  tier_id: number;
  is_active?: boolean;
  is_featured?: boolean;
}

export interface PlanWithTierResponse extends PlanAdmin {
  tier: {
    id: number;
    name: string;
    slug: string;
    description?: string;
  } | null;
}

export interface PlanResponse extends PlanAdmin {}

export interface PlanListResponse {
  plans: PlanAdmin[];
  total: number;
}

export interface PlanWithTierListResponse {
  plans: PlanWithTierResponse[];
  total: number;
}

export interface StripePriceOption {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  interval_count: number;
  nickname?: string | null;
}

export interface StripeProductVerificationResponse {
  is_valid: boolean;
  stripe_product_id: string;
  name: string;
  description?: string | null;
  image_urls: string[];
  prices: StripePriceOption[];
}

export interface PlanStripeSyncResultItem {
  plan_id: number;
  plan_name: string;
  reason?: string | null;
}

export interface PlanStripeSyncResponse {
  total_plans: number;
  updated_count: number;
  deactivated_count: number;
  unchanged_count: number;
  error_count: number;
  updated: PlanStripeSyncResultItem[];
  deactivated: PlanStripeSyncResultItem[];
  errors: PlanStripeSyncResultItem[];
}

export interface LawPack {
  id: number;
  name: string | null;
  jurisdiction: string;
  version: string;
  launch_date: string;
  status: string;
  badge?: string | null;
  file_count: number;
  tags?: string | null; // Comma-separated tags
  type?: string | null;
  region?: string | null;
  description?: string | null;
  name_pt?: string | null;
  badge_pt?: string | null;
  description_pt?: string | null;
  tags_pt?: string | null;
  region_pt?: string | null;
  type_pt?: string | null;
  supported_languages?: 'en' | 'pt' | 'both' | null;
}

export interface LawPackListResponse {
  law_packs: LawPack[];
}

export interface LawPackCreateRequest {
  name: string;
  jurisdiction: string;
  version: string;
  launch_date: string;
  status: string;
  badge?: string;
  tags?: string;
  type?: string;
  region?: string;
  description?: string;
}

export interface LawPackAssignmentRequest {
  law_pack_id: number;
}

// Report Types
export interface Report {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  file_size?: number;
  generated_by: User;
  organization: Organization;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  completed_at?: string | null;
}

export interface ReportListResponse {
  reports: Report[];
}

export interface ReportCreateRequest {
  title: string;
  description?: string;
  type: string;
  organization_id?: number;
}

export interface ReportUpdateRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

// System Types
export interface SystemInfo {
  version: string;
  environment: string;
  database_status: string;
  cache_status: string;
  uptime: number;
}

// Dashboard Types
export interface DashboardGrowth {
  this_month: number;
  last_month: number;
  percent_change: number;
  formatted: string;
}

export interface DashboardActivity {
  date: string;
  user: string;
  action: string;
  resource: string;
}

export interface DashboardQuotaAlert {
  org_id: number;
  org_name: string;
  quota_type: string;
  usage_percent: number;
  status: 'warning' | 'critical';
}

export interface DashboardSystemHealthDetails {
  status: string;
  healthy_quotas: number;
  problematic_quotas: number;
  total_quotas: number;
}

export interface DashboardSecurityDetails {
  active_configs: number;
  recent_events: number;
  recent_blocks: number;
  protection_status: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  user_growth: DashboardGrowth;
  total_organizations: number;
  active_organizations: number;
  organization_growth: DashboardGrowth;
  system_health: 'healthy' | 'warning' | 'critical';
  system_health_details: DashboardSystemHealthDetails;
  security_details: DashboardSecurityDetails;
  activation_codes_stats?: DashboardActivationCodesStats;
  quota_alerts: DashboardQuotaAlert[];
  recent_activities: DashboardActivity[];
  generated_at: string;
}

export interface DashboardActivationCodesStats {
  total_codes: number;
  active_codes: number;
  inactive_codes: number;
  total_activations: number;
  recent_activations: number;
  expiring_codes: number;
  top_codes: Array<{
    code: string;
    description: string;
    usage_percent: number;
    uses: string;
  }>;
}

export interface DashboardAnalyticsTimePeriod {
  start_date: string;
  end_date: string;
  days: number;
}

export interface DashboardRegistrationData {
  date: string;
  count: number;
}

export interface DashboardTopOrganization {
  org_id: number;
  org_name: string;
  user_count: number;
}

export interface DashboardAnalyticsSummary {
  total_new_users: number;
  total_new_orgs: number;
  avg_daily_users: number;
  avg_daily_orgs: number;
}

export interface DashboardAnalytics {
  time_period: DashboardAnalyticsTimePeriod;
  user_registrations: DashboardRegistrationData[];
  organization_registrations: DashboardRegistrationData[];
  top_organizations: DashboardTopOrganization[];
  summary: DashboardAnalyticsSummary;
}

// Billing Types
export interface BillingAccountStatsResponse {
  total_billing_accounts: number;
  active_billing_accounts: number;
  accounts_with_credit: number;
  accounts_with_debt: number;
}

export interface SubscriptionStatsResponse {
  total_subscriptions: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  past_due_subscriptions: number;
  monthly_recurring_revenue: number;
  annual_recurring_revenue: number;
}

// Rate Limiting Types
export interface RateLimitConfig {
  id: number;
  name: string;
  description?: string;
  endpoint_pattern: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateLimitLog {
  id: number;
  client_ip: string;
  endpoint: string;
  method: string;
  requests_count: number;
  limit_exceeded: boolean;
  timestamp: string;
}

// Audit Types
export interface AuditLog {
  id: number;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  resource_type?: string;
  resource_id?: number;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
  device?: string;
  city_name?: string | null;
  country_name?: string | null;
  timestamp: string;
  org_id?: number | null;
  org_name?: string | null;
  is_impersonation_action: boolean;
}

export interface AuditLogListResponse {
  audit_logs: AuditLog[];
}

// Quota Types
// Removed duplicate QuotaInfo - using the one at line 284

export interface QuotaDetail {
  id: number;
  organization_id: number;
  organization_name: string;
  tier_name: string;
  quota_type: string;
  current_usage: number;
  max_limit: number;
  reset_date: string;
  status: 'normal' | 'warning' | 'exceeded';
  last_reset: string;
}

export interface QuotaUserUsage {
  user_id: number;
  used: number;
  last_reset: string | null;
}

export interface QuotaTopUser {
  user_id: number;
  email: string;
  used: number;
}

export interface QuotaTypeInfo {
  quota_type: string;
  limit: number;
  used: number;
  remaining: number;
  percentage_used: number;
  period: string;
  last_reset: string | null;
  custom_limit: number | null;
  tier_limit: number;
  top_users?: QuotaTopUser[];
  user_usage?: QuotaUserUsage;
}

export interface QuotaUsageSummary {
  total_quotas: number;
  exceeded_quotas: number;
  near_limit_quotas: number;
  quota_by_type: Record<string, {
    total: number;
    exceeded: number;
    near_limit: number;
    average_usage_percent: number;
    total_used: number;
    total_limit: number;
    exceeded_organizations?: ExceededOrganization[];
  }>;
}

export interface CustomLimitRequest {
  quota_type: string;
  custom_limit: number | null;
}

export interface OrganizationCustomLimitResponse {
  type: string;
  old_custom_limit: number | null;
  new_custom_limit: number | null;
  tier_limit: number;
}

// Authentication Types
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  organization?: Organization;
  permissions?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  access_token: string;
  token_type: string;
}

export interface LogoutResponse {
  message: string;
}

export interface RoleComparisonResult {
  mismatch_detected: boolean;
  idp_role?: string | null;
  backend_role: string;
  expected_backend_role?: string | null;
  action_taken: string;
}

export interface AuthenticateResponse {
  session_established: boolean;
  user_id: number;
  user_created: boolean;
  role_comparison: RoleComparisonResult;
  session_expires_at: string;
  requires_action: boolean;
}

// System Types
export interface SystemHealthComponent {
  status: 'healthy' | 'unhealthy' | 'unknown' | 'disabled';
  details: string;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  response_time_ms: number;
  components: {
    database: SystemHealthComponent;
    redis: SystemHealthComponent;
    lambda: SystemHealthComponent;
    storage: SystemHealthComponent;
    virus_scanning: SystemHealthComponent;
  };
  unhealthy_components?: string[];
}

// Maintenance Types (duplicates removed - see definitions earlier in file)

export interface ImpersonationHistoryResponse {
  history: ImpersonationHistoryEntry[];
  total_sessions: number;
}

export interface ImpersonationSessionResponse {
  admin_user_id: number;
  admin_user_email: string;
  impersonated_user_id: number;
  impersonated_user_email: string;
  session_id: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface ImpersonationStatusResponse {
  is_impersonating: boolean;
  session?: ImpersonationSessionResponse;
}

// Law Pack Types
export interface LawPack {
  id: number;
  name: string | null;
  jurisdiction: string;
  version: string;
  launch_date: string;
  status: string;
  badge?: string | null;
  file_path: string;
  created_at: string;
  updated_at: string;
  tags?: string | null;
  type?: string | null;
  region?: string | null;
  description?: string | null;
  name_pt?: string | null;
  badge_pt?: string | null;
  description_pt?: string | null;
  tags_pt?: string | null;
  region_pt?: string | null;
  type_pt?: string | null;
  supported_languages?: 'en' | 'pt' | 'both' | null;
}

export interface LawPackListResponse {
  law_packs: LawPack[];
}

// Organization Assignment Types
export interface AssignedLawPack {
  id: number;
  name: string;
  jurisdiction: string;
  version: string;
  status: string;
  assigned_at: string | null;
}

export interface TierRestrictions {
  max_law_packs: number; // -1 for unlimited
  cooldown_days: number | null;
  can_change: boolean;
  current_count: number;
  can_change_now: boolean;
  next_change_allowed: string | null;
}

export interface OrganizationAssignment {
  organization: {
    id: number;
    name: string;
    tier_name: string;
    tier_slug: string | null;
    subscription_status: string | null;
    last_law_change_at: string | null;
  };
  assigned_law_packs: AssignedLawPack[];
  restrictions: TierRestrictions;
}

export interface OrganizationAssignmentsResponse {
  organizations: OrganizationAssignment[];
  metadata: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Alternative name for SuccessMessageResponse for backward compatibility
export interface SuccessResponse {
  message: string;
  success: boolean;
}

// Quota Types
export interface ExceededOrganization {
  org_id: number;
  org_name: string;
  used: number;
  limit: number;
  usage_percent: number;
}

// Organization-centric quota management types
export interface OrganizationQuotaDetail {
  type: string;
  used: number;
  limit: number;
  custom_limit: number | null;
  usage_percent: number;
  status: 'healthy' | 'warning' | 'critical' | 'exceeded' | 'unlimited' | 'not_set' | 'not_configured';
  has_custom_limit: boolean;
}

export interface OrganizationQuotaManagement {
  id: number;
  name: string;
  tier: {
    id: number | null;
    name: string;
    slug: string | null;
  };
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  quotas: OrganizationQuotaDetail[];
  total_quotas: number;
  active_quotas: number;
  custom_limits_count: number;
}

export interface OrganizationsQuotaManagementResponse {
  organizations: OrganizationQuotaManagement[];
  total: number;
  page: number;
  size: number;
  summary: {
    total_organizations: number;
    organizations_with_quotas: number;
    organizations_without_tier: number;
    quota_types_available: string[];
  };
}

// Request payload types
export interface CreateUserRequest {
  email: string;
  name: string;
  phone_number?: string;
  preferred_language?: string;
  role: string;
  org_id?: number;
  password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone_number?: string;
  preferred_language?: string;
  role?: string;
  org_id?: number;
  is_active?: boolean;
}

export interface CreateOrganizationRequest {
  name: string;
  tier_id?: number | null;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL';
}

export interface UpdateOrganizationRequest {
  name?: string;
  tier_id?: number | null;
  service_type: string;
  billing_location?: 'WORLD' | 'BRAZIL' | null;
}

export interface RateLimitConfigRequest {
  name: string;
  description?: string;
  path_pattern: string;
  match_type: 'exact' | 'start_with';
  requests_per_minute: number;
  burst_limit: number;
  block_duration_seconds: number;
  priority: number;
  is_active?: boolean;
}

export type ActivationCodeRecipientMode = 'existing_user' | 'open_registration';

export interface ActivationCodeRequest {
  description?: string | null;
  is_active?: boolean;
  tier_id?: number | null;
  organization_id: number;
  recipient_mode?: ActivationCodeRecipientMode;
  recipient_user_id?: number | null;
  registration_role?: string | null;
  confirm_org_has_tier?: boolean;
  expires_at?: string | null;
}

// Auth0 Types
export interface Auth0ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error';
  domain: string;
  domain_reachable?: boolean;
  jwks_accessible?: boolean;
  management_api_accessible?: boolean;
  tenant_name?: string;
  error?: string;
  last_checked: string;
}

export interface MFAFactor {
  name: string;
  enabled: boolean;
  trial_expired?: boolean;
}

export interface MFAStatus {
  status: 'success' | 'error';
  mfa_enabled?: boolean;
  enabled_factors?: MFAFactor[];
  available_factors?: MFAFactor[];
  policies?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    settings?: Record<string, unknown>;
  }>;
  error?: string;
  last_checked: string;
}

export interface Auth0Settings {
  connection_status: Auth0ConnectionStatus;
  mfa_status: MFAStatus;
}

export interface MfaFactorUpdateRequest {
  factor_name: string;
  enabled: boolean;
}

export interface EngineRequest {
  name: string;
  queue_url: string;
  service_name: string;
  version?: string;
  description?: string;
  is_active?: boolean;
  law_pack_ids?: number[];
}

export interface Engine {
  id: number;
  name: string;
  queue_url: string;
  service_name: string;
  status: string;
  health_status?: string;
  average_response_time?: number;
  success_rate?: number;
  total_requests?: number;
  failed_requests?: number;
  max_concurrent_tasks?: number;
  timeout_seconds?: number;
  description?: string;
  version?: string;
  created_at?: string;
  updated_at?: string;
  last_health_check?: string;
  supported_law_packs?: Array<{
    id: number;
    name: string;
    version: string;
    law_pack_id?: number;
    law_pack_name?: string;
    law_pack_status?: string;
  }>;
  supported_law_pack_count?: number;
}

export interface RoleMapping {
  id: number;
  auth0_role: string;
  backend_role: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface RoleMappingListResponse {
  mappings: RoleMapping[];
  total_count: number;
  active_count: number;
  inactive_count: number;
}

export interface RoleMappingUpdateRequest {
  auth0_role?: string;
  backend_role?: string;
  description?: string;
  is_active?: boolean;
}
