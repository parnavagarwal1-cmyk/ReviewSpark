'use client';

import { useEffect, useState } from 'react';
import type { DashboardStats, MonthlyTrend } from '@/types';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Review performance, AI usage, and cost monitoring</p>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
          Loading analytics…
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          {/* Overview Stats */}
          <div className="stats-grid">
            <StatCard value={stats.total_businesses} label="Businesses" icon="🏢" />
            <StatCard value={stats.total_scans.toLocaleString()} label="Total Scans" icon="📱" />
            <StatCard value={stats.total_drafts.toLocaleString()} label="Drafts Generated" icon="✍️" />
            <StatCard value={stats.total_copies.toLocaleString()} label="Copy Clicks" icon="📋" />
            <StatCard value={stats.total_google_clicks.toLocaleString()} label="→ Google" icon="🔗" />
            <StatCard value={`$${stats.total_ai_cost_usd.toFixed(4)}`} label="Total AI Cost" icon="💰" />
          </div>

          {/* Disclaimer */}
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-xl)' }}>
            ℹ️ <strong>Note:</strong> &ldquo;→ Google&rdquo; counts clicks on the &ldquo;Continue to Google&rdquo; button.
            ReviewSpark cannot verify whether a review was actually submitted on Google.
            Do not report click counts as published reviews.
          </div>

          {/* Monthly Trends */}
          {stats.monthly_trends.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', color: 'var(--admin-text)' }}>
                Monthly Trends (Last 6 Months)
              </h2>
              <MonthlyTable trends={stats.monthly_trends} />
            </div>
          )}

          {/* Funnel + Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
                Conversion Funnel
              </h2>
              <FunnelBar label="QR Scans" value={stats.total_scans} total={stats.total_scans} color="#6366f1" />
              <FunnelBar label="AI Drafts Generated" value={stats.total_drafts} total={stats.total_scans} color="#f59e0b" />
              <FunnelBar label="Copy Clicks" value={stats.total_copies} total={stats.total_scans} color="#10b981" />
              <FunnelBar label="Continue to Google" value={stats.total_google_clicks} total={stats.total_scans} color="#06b6d4" />
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
                AI Cost Monitoring
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <InfoRow label="Total Drafts" value={stats.total_drafts.toLocaleString()} />
                <InfoRow label="Total Tokens Used" value={stats.total_tokens.toLocaleString()} />
                <InfoRow label="Total Estimated Cost" value={`$${stats.total_ai_cost_usd.toFixed(6)}`} />
                <InfoRow
                  label="Avg Cost per Draft"
                  value={stats.total_drafts > 0
                    ? `$${(stats.total_ai_cost_usd / stats.total_drafts).toFixed(6)}`
                    : 'N/A'
                  }
                />
                <InfoRow
                  label="Scan → Draft Rate"
                  value={stats.total_scans > 0
                    ? `${((stats.total_drafts / stats.total_scans) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                />
                <InfoRow
                  label="Draft → Google Rate"
                  value={stats.total_drafts > 0
                    ? `${((stats.total_google_clicks / stats.total_drafts) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                />
              </div>

              <div className="alert alert-warning" style={{ marginTop: 'var(--space-md)', fontSize: '0.8rem' }}>
                ⚠️ Costs are estimates based on approximate model pricing.
                Check your OpenAI dashboard for accurate billing.
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }} aria-hidden="true">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function FunnelBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
        <span style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>
          {value.toLocaleString()} <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div style={{ height: '8px', background: 'var(--admin-surface-raised)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--admin-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function MonthlyTable({ trends }: { trends: MonthlyTrend[] }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Scans</th>
            <th>Drafts</th>
            <th>Copies</th>
            <th>→ Google</th>
            <th>Conversion</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((t) => (
            <tr key={t.month}>
              <td style={{ fontWeight: 600 }}>{t.month}</td>
              <td>{t.scans.toLocaleString()}</td>
              <td>{t.drafts.toLocaleString()}</td>
              <td>{t.copies.toLocaleString()}</td>
              <td>{t.google_clicks.toLocaleString()}</td>
              <td>
                <span style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                  {t.scans > 0 ? `${((t.google_clicks / t.scans) * 100).toFixed(1)}%` : '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
