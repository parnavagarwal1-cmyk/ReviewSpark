/**
 * Analytics helpers for ReviewSpark.
 * Records scan events in the database asynchronously (fire-and-forget with error handling).
 */

import { supabase } from './supabase';
import { hashIp } from './rateLimit';

export type EventType = 'scan' | 'draft_generated' | 'copy_click' | 'continue_to_google';

export interface RecordEventOptions {
  businessId: string;
  eventType: EventType;
  rating?: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Records a scan event in the database.
 * Errors are logged but do not throw — analytics should never break the user flow.
 */
export async function recordEvent(opts: RecordEventOptions): Promise<void> {
  try {
    const ipHash = opts.ip ? hashIp(opts.ip) : null;

    await supabase.from('scan_events').insert({
      business_id: opts.businessId,
      event_type: opts.eventType,
      rating: opts.rating ?? null,
      ip_hash: ipHash,
      // Store a short user-agent prefix only (not full UA for privacy)
      user_agent: opts.userAgent ? opts.userAgent.slice(0, 150) : null,
    });
  } catch (err) {
    console.error('[analytics] recordEvent error:', err);
  }
}

/**
 * Records an AI usage entry.
 */
export async function recordAiUsage(opts: {
  businessId: string;
  model: string;
  tokensPrompt: number;
  tokensCompletion: number;
  estimatedCostUsd: number;
}): Promise<void> {
  try {
    await supabase.from('ai_usage').insert({
      business_id: opts.businessId,
      model: opts.model,
      tokens_prompt: opts.tokensPrompt,
      tokens_completion: opts.tokensCompletion,
      estimated_cost_usd: opts.estimatedCostUsd,
    });
  } catch (err) {
    console.error('[analytics] recordAiUsage error:', err);
  }
}

/**
 * Fetches dashboard-level aggregate statistics.
 */
export async function getDashboardStats() {
  const [businessesResult, scanStats, aiStats, monthlyTrends] =
    await Promise.all([
      supabase
        .from('businesses')
        .select('id, is_active', { count: 'exact', head: false }),

      supabase.from('scan_events').select('event_type'),

      supabase
        .from('ai_usage')
        .select('estimated_cost_usd, tokens_prompt, tokens_completion'),

      getMonthlyTrends(),
    ]);

  const businesses = businessesResult.data ?? [];
  const total_businesses = businessesResult.count ?? 0;
  const active_businesses = businesses.filter((b) => b.is_active).length;

  const scanEvents = scanStats.data ?? [];
  const total_scans = scanEvents.filter((e) => e.event_type === 'scan').length;
  const total_drafts = scanEvents.filter((e) => e.event_type === 'draft_generated').length;
  const total_copies = scanEvents.filter((e) => e.event_type === 'copy_click').length;
  const total_google_clicks = scanEvents.filter(
    (e) => e.event_type === 'continue_to_google'
  ).length;

  const aiRecords = aiStats.data ?? [];
  const total_ai_cost_usd = aiRecords.reduce(
    (sum, r) => sum + Number(r.estimated_cost_usd),
    0
  );
  const total_tokens = aiRecords.reduce(
    (sum, r) => sum + r.tokens_prompt + r.tokens_completion,
    0
  );

  return {
    total_businesses,
    active_businesses,
    total_scans,
    total_drafts,
    total_copies,
    total_google_clicks,
    total_ai_cost_usd,
    total_tokens,
    monthly_trends: monthlyTrends,
  };
}

async function getMonthlyTrends() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabase
    .from('scan_events')
    .select('event_type, created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (!data) return [];

  // Group by month
  const monthMap = new Map<
    string,
    { scans: number; drafts: number; copies: number; google_clicks: number }
  >();

  for (const event of data) {
    const month = event.created_at.slice(0, 7); // 'YYYY-MM'
    if (!monthMap.has(month)) {
      monthMap.set(month, { scans: 0, drafts: 0, copies: 0, google_clicks: 0 });
    }
    const entry = monthMap.get(month)!;
    if (event.event_type === 'scan') entry.scans++;
    if (event.event_type === 'draft_generated') entry.drafts++;
    if (event.event_type === 'copy_click') entry.copies++;
    if (event.event_type === 'continue_to_google') entry.google_clicks++;
  }

  return Array.from(monthMap.entries()).map(([month, stats]) => ({
    month,
    ...stats,
  }));
}
