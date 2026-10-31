// ReviewSpark — Shared TypeScript Types

export type DataSource = 'google_places' | 'manual';

export interface Business {
  id: string;
  public_token: string;
  google_review_url: string;
  place_id: string | null;
  business_name: string;
  address: string | null;
  category: string | null;
  data_source: DataSource;
  google_review_destination: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  google_data_refreshed_at: string | null;
  custom_context?: string | null;
}

export interface BusinessStats extends Business {
  total_scans: number;
  total_drafts: number;
  total_copies: number;
  total_google_clicks: number;
  total_ai_cost_usd: number;
  total_tokens: number;
}

export interface ScanEvent {
  id: string;
  business_id: string;
  event_type: 'scan' | 'draft_generated' | 'copy_click' | 'continue_to_google';
  rating: number | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AiUsage {
  id: string;
  business_id: string;
  model: string;
  tokens_prompt: number;
  tokens_completion: number;
  estimated_cost_usd: number;
  created_at: string;
}

export interface AdminSession {
  id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  is_revoked: boolean;
}

// ── API request/response types ──────────────────────────────

export interface CreateBusinessInput {
  google_review_url: string;
  business_name?: string;   // required if data_source ends up 'manual'
  address?: string;
  category?: string;
  custom_context?: string;
}

export interface UpdateBusinessInput {
  business_name?: string;
  address?: string;
  category?: string;
  is_active?: boolean;
  google_review_url?: string;
  custom_context?: string;
}

export interface DraftGenerationInput {
  token: string;
  rating: number;       // 1–5
  customer_note?: string; // Optional user experience note
}

export interface DraftGenerationOutput {
  drafts: [string, string];   // exactly two options
  business_name: string;
  rating: number;
}

export interface ReviewContextOutput {
  business_name: string;
  google_review_destination: string;
  public_token: string;
}

// ── Analytics types ─────────────────────────────────────────

export interface MonthlyTrend {
  month: string;           // 'YYYY-MM'
  scans: number;
  drafts: number;
  copies: number;
  google_clicks: number;
}

export interface DashboardStats {
  total_businesses: number;
  active_businesses: number;
  total_scans: number;
  total_drafts: number;
  total_copies: number;
  total_google_clicks: number;
  total_ai_cost_usd: number;
  total_tokens: number;
  monthly_trends: MonthlyTrend[];
}

// ── Pagination ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ── API error shape ──────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}
