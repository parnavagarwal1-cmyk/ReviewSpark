'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardStats } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your ReviewSpark performance at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link href="/businesses?search_maps=true" className="btn btn-secondary" id="dashboard-find-maps-btn">
            🔍 Find on Google Maps
          </Link>
          <Link href="/businesses" className="btn btn-primary" id="dashboard-add-business-btn">
            + Add Business
          </Link>
        </div>
      </div>

      {loading && (
        <div className="stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: '2.5rem', width: '60%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '0.875rem', width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {stats && (
        <>
          <div className="stats-grid">
            <StatCard value={stats.total_businesses} label="Total Businesses" icon="🏢" />
            <StatCard value={stats.active_businesses} label="Active" icon="✅" />
            <StatCard value={stats.total_scans.toLocaleString()} label="QR Scans" icon="📱" />
            <StatCard value={stats.total_drafts.toLocaleString()} label="AI Drafts" icon="✍️" />
            <StatCard value={stats.total_google_clicks.toLocaleString()} label="→ Google" icon="🔗" />
            <StatCard
              value={`$${stats.total_ai_cost_usd.toFixed(4)}`}
              label="AI Cost"
              icon="💰"
            />
          </div>

          {stats.monthly_trends.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', color: 'var(--admin-text)' }}>
                Monthly Trends
              </h2>
              <MonthlyChart trends={stats.monthly_trends} />
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--admin-text)' }}>
                Conversion Funnel
              </h2>
              <FunnelRow label="QR Scans" value={stats.total_scans} total={stats.total_scans} color="#6366f1" />
              <FunnelRow label="Drafts Generated" value={stats.total_drafts} total={stats.total_scans} color="#f59e0b" />
              <FunnelRow label="Copy Clicks" value={stats.total_copies} total={stats.total_scans} color="#10b981" />
              <FunnelRow label="→ Google" value={stats.total_google_clicks} total={stats.total_scans} color="#06b6d4" />
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--admin-text)' }}>
                AI Usage
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <InfoRow label="Total Drafts" value={stats.total_drafts.toLocaleString()} />
                <InfoRow label="Total Tokens" value={stats.total_tokens.toLocaleString()} />
                <InfoRow label="Estimated Cost" value={`$${stats.total_ai_cost_usd.toFixed(6)}`} />
                <InfoRow
                  label="Cost per Draft"
                  value={stats.total_drafts > 0
                    ? `$${(stats.total_ai_cost_usd / stats.total_drafts).toFixed(6)}`
                    : 'N/A'}
                />
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
      <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function FunnelRow({
  label, value, total, color,
}: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>
          {value.toLocaleString()} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--admin-border)', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '4px',
            transition: 'width 0.6s ease',
          }}
        />
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

function MonthlyChart({ trends }: { trends: { month: string; scans: number; drafts: number }[] }) {
  const maxScans = Math.max(...trends.map((t) => t.scans), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--admin-text-muted)' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#6366f1', borderRadius: '2px' }} />
          Scans
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--admin-text-muted)' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
          Drafts
        </span>
      </div>
      <div className="chart-container">
        {trends.map((t) => (
          <div key={t.month} className="chart-bar-group">
            <div
              className="chart-bar chart-bar-scans"
              style={{ height: `${(t.scans / maxScans) * 100}%` }}
              role="img"
              aria-label={`${t.month}: ${t.scans} scans`}
            />
            <div className="chart-bar-label">{t.month.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
