-- ReviewSpark: Initial Database Schema
-- Run this in your Supabase SQL editor or psql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Businesses Table
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token              TEXT UNIQUE NOT NULL,
  google_review_url         TEXT NOT NULL,
  place_id                  TEXT,
  business_name             TEXT NOT NULL,
  address                   TEXT,
  category                  TEXT,
  data_source               TEXT NOT NULL DEFAULT 'manual'
                              CHECK (data_source IN ('google_places', 'manual')),
  google_review_destination TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  google_data_refreshed_at  TIMESTAMPTZ
);

-- Indexes for businesses
CREATE INDEX IF NOT EXISTS idx_businesses_public_token ON businesses(public_token);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active    ON businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at   ON businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_place_id     ON businesses(place_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Admin Sessions Table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_revoked  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash  ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at  ON admin_sessions(expires_at);

-- ============================================================
-- Scan Events Table
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL
                 CHECK (event_type IN ('scan', 'draft_generated', 'copy_click', 'continue_to_google')),
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
  ip_hash      TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_business_id  ON scan_events(business_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_event_type   ON scan_events(event_type);
CREATE INDEX IF NOT EXISTS idx_scan_events_created_at   ON scan_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_biz_date     ON scan_events(business_id, created_at DESC);

-- Partition hint: for 500k scans/month, consider monthly partitioning.
-- Example: PARTITION BY RANGE (created_at) — requires Postgres 10+

-- ============================================================
-- AI Usage Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  model               TEXT NOT NULL,
  tokens_prompt       INTEGER NOT NULL DEFAULT 0,
  tokens_completion   INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd  NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_business_id ON ai_usage(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at  ON ai_usage(created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- These policies assume a service_role key for the admin backend.
-- The anon key should have NO direct table access.
-- ============================================================
ALTER TABLE businesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage       ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass RLS (default Supabase behavior)
-- No anon policies are granted — all DB access goes through server-side API routes.

-- ============================================================
-- Helpful Views
-- ============================================================
CREATE OR REPLACE VIEW business_stats AS
SELECT
  b.id,
  b.business_name,
  b.public_token,
  b.is_active,
  b.data_source,
  b.created_at,
  COUNT(CASE WHEN se.event_type = 'scan'              THEN 1 END) AS total_scans,
  COUNT(CASE WHEN se.event_type = 'draft_generated'   THEN 1 END) AS total_drafts,
  COUNT(CASE WHEN se.event_type = 'copy_click'        THEN 1 END) AS total_copies,
  COUNT(CASE WHEN se.event_type = 'continue_to_google' THEN 1 END) AS total_google_clicks,
  COALESCE(SUM(au.estimated_cost_usd), 0)                          AS total_ai_cost_usd,
  COALESCE(SUM(au.tokens_prompt + au.tokens_completion), 0)        AS total_tokens
FROM businesses b
LEFT JOIN scan_events se ON se.business_id = b.id
LEFT JOIN ai_usage    au ON au.business_id = b.id
GROUP BY b.id;
