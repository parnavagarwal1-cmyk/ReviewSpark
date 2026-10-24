-- ReviewSpark: Performance & Monitoring Indexes
-- Run after 001_initial.sql

CREATE INDEX IF NOT EXISTS idx_scan_events_monthly
ON public.scan_events (created_at, event_type);

CREATE INDEX IF NOT EXISTS idx_businesses_name_lower
ON public.businesses (LOWER(business_name));

CREATE INDEX IF NOT EXISTS idx_scan_events_active_recent
ON public.scan_events (business_id, created_at DESC);
