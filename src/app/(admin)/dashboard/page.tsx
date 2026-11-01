'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { DashboardStats, Business, PaginatedResponse } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [statsRes, bizRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/businesses?pageSize=5'),
      ]);

      if (!statsRes.ok) throw new Error('Failed to load telemetry stats');
      const statsData: DashboardStats = await statsRes.json();
      setStats(statsData);

      if (bizRes.ok) {
        const bizData: PaginatedResponse<Business> = await bizRes.json();
        setBusinesses(bizData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const convRate = stats && stats.total_scans > 0
    ? ((stats.total_google_clicks / stats.total_scans) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Top Hero / Command Header ────────────────────────────────────────── */}
      <div className="adm-dash-hero">
        <div>
          <div className="adm-hero-pill">
            <span className="adm-pill-dot" />
            Live Reputation Telemetry · ReviewSpark Engine
          </div>
          <h1 className="adm-hero-title">Executive Dashboard</h1>
          <p className="adm-hero-sub">
            Monitor real-time QR scans, dual-language AI drafts, and Google review conversions.
          </p>
        </div>

        <div className="adm-hero-actions">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            title="Refresh latest metrics"
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
            <span>{refreshing ? 'Updating…' : 'Sync Data'}</span>
          </button>

          <Link
            href="/businesses"
            className="btn btn-primary"
            id="dashboard-add-business-btn"
            style={{ fontWeight: 700 }}
          >
            <span>+ Add Business</span>
          </Link>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => loadData()} style={{ color: '#fff', textDecoration: 'underline', fontSize: '0.85rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Skeleton Loading ──────────────────────────────────────────────────── */}
      {loading && !stats && (
        <div className="adm-kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-kpi-card">
              <div className="skeleton" style={{ height: '2rem', width: '40%', marginBottom: '0.75rem', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '2.5rem', width: '75%', marginBottom: '0.5rem', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '0.85rem', width: '55%', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Grid ──────────────────────────────────────────────────────────── */}
      {stats && (
        <>
          <div className="adm-kpi-grid">
            <KpiCard
              value={stats.total_scans.toLocaleString()}
              label="QR Counter Scans"
              sub="Zero-friction in-store scans"
              badge="Total Reach"
              badgeColor="green"
              icon="📱"
              gradient="linear-gradient(90deg, #10b981, #34d399)"
            />
            <KpiCard
              value={stats.total_drafts.toLocaleString()}
              label="AI Drafts Created"
              sub="English & Hinglish drafts"
              badge="Dual AI"
              badgeColor="amber"
              icon="✍️"
              gradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
            />
            <KpiCard
              value={stats.total_copies.toLocaleString()}
              label="Copied to Clipboard"
              sub="Customer customized text"
              badge="Ready to post"
              badgeColor="teal"
              icon="📋"
              gradient="linear-gradient(90deg, #06b6d4, #22d3ee)"
            />
            <KpiCard
              value={stats.total_google_clicks.toLocaleString()}
              label="→ Google Maps"
              sub="Public review redirects"
              badge="High intent"
              badgeColor="emerald"
              icon="⭐"
              gradient="linear-gradient(90deg, #10b981, #6ee7b7)"
            />
            <KpiCard
              value={`${convRate}%`}
              label="Scan-to-Review Rate"
              sub={`${stats.total_google_clicks} of ${stats.total_scans || 1} scans`}
              badge="Funnel"
              badgeColor="indigo"
              icon="🎯"
              gradient="linear-gradient(90deg, #6366f1, #818cf8)"
            />
            <KpiCard
              value={`$${stats.total_ai_cost_usd.toFixed(4)}`}
              label="Total AI Overhead"
              sub={`~₹${(stats.total_ai_cost_usd * 86).toFixed(2)} total cost`}
              badge="Ultra-efficient"
              badgeColor="purple"
              icon="⚡"
              gradient="linear-gradient(90deg, #8b5cf6, #c084fc)"
            />
          </div>

          {/* ── Mid Row: Funnel & Monthly Activity ─────────────────────────────────── */}
          <div className="adm-two-col">

            {/* Funnel Card */}
            <div className="adm-card">
              <div className="adm-card-head">
                <div className="adm-card-title">
                  <span>⚡</span>
                  <span>Conversion & Review Funnel</span>
                </div>
                <span className="adm-card-tag">End-to-End Pipeline</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <FunnelStep
                  label="1. Counter QR Scanned"
                  count={stats.total_scans}
                  total={stats.total_scans}
                  color="linear-gradient(90deg, #10b981, #34d399)"
                  icon="📱"
                />
                <FunnelStep
                  label="2. AI Review Draft Generated"
                  count={stats.total_drafts}
                  total={stats.total_scans}
                  color="linear-gradient(90deg, #f59e0b, #fbbf24)"
                  icon="🤖"
                />
                <FunnelStep
                  label="3. Draft Copied by Customer"
                  count={stats.total_copies}
                  total={stats.total_scans}
                  color="linear-gradient(90deg, #06b6d4, #22d3ee)"
                  icon="📋"
                />
                <FunnelStep
                  label="4. Clicked 'Continue to Google'"
                  count={stats.total_google_clicks}
                  total={stats.total_scans}
                  color="linear-gradient(90deg, #10b981, #6ee7b7)"
                  icon="🌟"
                />
              </div>

              {/* Shield Banner */}
              <div className="adm-shield-banner">
                <div className="adm-shield-icon">🛡️</div>
                <div className="adm-shield-text">
                  <h4>Google Rating Shield Active</h4>
                  <p>
                    All 1★–3★ ratings are filtered into your private inbox before reaching Google Maps. Public rating is preserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Trends Card */}
            <div className="adm-card">
              <div className="adm-card-head">
                <div className="adm-card-title">
                  <span>📈</span>
                  <span>Monthly Review Trajectory</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '2px' }} />
                    Scans
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '2px' }} />
                    AI Drafts
                  </span>
                </div>
              </div>

              {stats.monthly_trends.length > 0 ? (
                <MonthlyChartVisual trends={stats.monthly_trends} />
              ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No monthly trend data recorded yet.</p>
                  <p style={{ fontSize: '0.78rem' }}>Scans and generated reviews will appear here as customers interact.</p>
                </div>
              )}

              {/* AI Details Strip */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="adm-info-row">
                  <span className="adm-info-lbl">Active AI Model</span>
                  <span className="adm-info-val" style={{ color: '#34d399' }}>Gemini 1.5 Flash / GPT-4o-mini</span>
                </div>
                <div className="adm-info-row">
                  <span className="adm-info-lbl">Total Tokens Processed</span>
                  <span className="adm-info-val">{stats.total_tokens.toLocaleString()} tokens</span>
                </div>
                <div className="adm-info-row">
                  <span className="adm-info-lbl">Average Generation Latency</span>
                  <span className="adm-info-val" style={{ color: '#fbbf24' }}>~1.2 seconds</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Section: Registered Businesses & Quick Actions ─────────────── */}
          <div className="adm-card">
            <div className="adm-card-head">
              <div>
                <div className="adm-card-title">
                  <span>🏢</span>
                  <span>Registered Outlets & Counter Stands</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  Manage QR codes, test customer review experience, and download counter stands.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link href="/businesses" className="adm-action-link">
                  <span>View All ({stats.total_businesses})</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {businesses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 700, marginBottom: '0.3rem' }}>
                  No Businesses Registered Yet
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                  Add your first outlet or counter stand to generate a unique QR code and test the flow.
                </p>
                <Link href="/businesses" className="btn btn-primary btn-sm">
                  + Add Your First Business
                </Link>
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Business Outlet</th>
                      <th>Category & Location</th>
                      <th>Status</th>
                      <th>Quick Access</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((biz) => (
                      <tr key={biz.id}>
                        <td>
                          <div className="adm-biz-name">
                            <span>{biz.business_name}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                            Token: {biz.public_token}
                          </span>
                        </td>
                        <td>
                          <div style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                            {biz.category || 'General Business'}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                            {biz.city || biz.address || 'Location Not Specified'}
                          </div>
                        </td>
                        <td>
                          {biz.is_active ? (
                            <span className="adm-biz-badge">● Active</span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              Paused
                            </span>
                          )}
                        </td>
                        <td>
                          <a
                            href={`/r/${biz.public_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-action-link"
                            title="Test public customer flow"
                          >
                            <span>📱 Scan Flow</span>
                            <span>↗</span>
                          </a>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            href={`/businesses/${biz.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Manage ⚙️
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────────── */

interface KpiCardProps {
  value: string;
  label: string;
  sub: string;
  badge: string;
  badgeColor: string;
  icon: string;
  gradient: string;
}

function KpiCard({ value, label, sub, badge, badgeColor, icon, gradient }: KpiCardProps) {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'green':
      case 'emerald':
        return { background: 'rgba(16, 185, 129, 0.14)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'amber':
        return { background: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'teal':
        return { background: 'rgba(6, 182, 212, 0.14)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'indigo':
        return { background: 'rgba(99, 102, 241, 0.14)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' };
      case 'purple':
        return { background: 'rgba(139, 92, 246, 0.14)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' };
      default:
        return { background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8' };
    }
  };

  return (
    <div className="adm-kpi-card" style={{ ['--kpi-gradient' as any]: gradient }}>
      <div className="adm-kpi-top">
        <div className="adm-kpi-icon-wrap" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {icon}
        </div>
        <span className="adm-kpi-badge" style={getBadgeStyle()}>{badge}</span>
      </div>
      <div className="adm-kpi-val">{value}</div>
      <div className="adm-kpi-lbl">{label}</div>
      <div className="adm-kpi-sub">{sub}</div>
    </div>
  );
}

interface FunnelStepProps {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: string;
}

function FunnelStep({ label, count, total, color, icon }: FunnelStepProps) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  return (
    <div className="adm-funnel-step">
      <div className="adm-funnel-info">
        <span className="adm-funnel-name">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className="adm-funnel-nums">
          {count.toLocaleString()} <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>({pct}%)</span>
        </span>
      </div>
      <div className="adm-funnel-track">
        <div
          className="adm-funnel-fill"
          style={{
            width: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function MonthlyChartVisual({ trends }: { trends: { month: string; scans: number; drafts: number }[] }) {
  const maxVal = Math.max(...trends.flatMap(t => [t.scans, t.drafts]), 1);

  return (
    <div className="adm-chart-wrap">
      {trends.map((t) => {
        const scanH = Math.max(6, Math.round((t.scans / maxVal) * 100));
        const draftH = Math.max(6, Math.round((t.drafts / maxVal) * 100));

        return (
          <div key={t.month} className="adm-chart-col">
            <div className="adm-chart-bars">
              <div
                className="adm-bar adm-bar-scans"
                style={{ height: `${scanH}%` }}
                title={`${t.month}: ${t.scans} scans`}
              />
              <div
                className="adm-bar adm-bar-drafts"
                style={{ height: `${draftH}%` }}
                title={`${t.month}: ${t.drafts} AI drafts`}
              />
            </div>
            <span className="adm-chart-month">{t.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}
