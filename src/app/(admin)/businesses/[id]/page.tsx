'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { Business } from '@/types';

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { id } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [qrDataUri, setQrDataUri] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ business_name: '', address: '', category: '', custom_context: '' });
  const [saving, setSaving] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    async function loadQrPreview(token: string) {
      try {
        const QRCode = await import('qrcode');
        const reviewUrl = `${baseUrl}/r/${token}`;
        const dataUri = await QRCode.toDataURL(reviewUrl, {
          width: 200,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        setQrDataUri(dataUri);
      } catch {
        // QR preview is non-critical
      }
    }

    async function load() {
      try {
        const res = await fetch(`/api/businesses/${id}`);
        if (!res.ok) throw new Error('Business not found');
        const data: Business = await res.json();
        setBusiness(data);
        setEditData({
          business_name: data.business_name,
          address: data.address ?? '',
          category: data.category ?? '',
          custom_context: data.custom_context ?? '',
        });
        // Load QR preview
        await loadQrPreview(data.public_token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, baseUrl]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/businesses/${id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Refresh failed');
        return;
      }
      setBusiness(data);
    } catch {
      alert('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setBusiness(updated);
      setEditMode(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
        Loading business details…
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="alert alert-error">
        {error || 'Business not found'}
        <Link href="/businesses" style={{ marginLeft: '1rem', textDecoration: 'underline' }}>
          Back to list
        </Link>
      </div>
    );
  }

  const reviewPageUrl = `${baseUrl}/r/${business.public_token}`;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link
          href="/businesses"
          style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}
        >
          ← Back to Businesses
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1 className="page-title">{business.business_name}</h1>
            <span
              className={`badge ${business.is_active ? 'badge-success' : 'badge-danger'}`}
            >
              {business.is_active ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`badge ${business.data_source === 'google_places' ? 'badge-info' : 'badge-warning'}`}
            >
              {business.data_source === 'google_places' ? '🔍 Google Places' : '✏️ Manual'}
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Added {new Date(business.created_at).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {business.data_source === 'google_places' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              id="refresh-google-data-btn"
              title="Refresh name, address, category from Google Places (max once per 30 days recommended)"
            >
              {refreshing ? (
                <>
                  <span className="spinner" /> Refreshing…
                </>
              ) : (
                '🔄 Refresh Google Data'
              )}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setEditMode(!editMode)}
            id="edit-business-btn"
          >
            {editMode ? 'Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>

        {/* Business Info */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Business Information</h2>

          {editMode ? (
            <div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Business Name</label>
                <input
                  id="edit-name"
                  className="form-input"
                  value={editData.business_name}
                  onChange={(e) => setEditData((d) => ({ ...d, business_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-address">Address</label>
                <input
                  id="edit-address"
                  className="form-input"
                  value={editData.address}
                  onChange={(e) => setEditData((d) => ({ ...d, address: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-category">Category</label>
                <input
                  id="edit-category"
                  className="form-input"
                  value={editData.category}
                  onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-highlights">
                  ✨ Business Details &amp; Highlights (for AI Reviews)
                </label>
                <textarea
                  id="edit-highlights"
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Famous for Paneer Tikka, Quick Delivery, Rooftop ambience, 15+ years trusted"
                  value={editData.custom_context}
                  onChange={(e) => setEditData((d) => ({ ...d, custom_context: e.target.value }))}
                />
                <span className="form-hint">
                  AI will use these details to write highly personalized, authentic reviews without hallucinating.
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
                id="save-business-btn"
              >
                {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Changes'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InfoRow label="Name" value={business.business_name} />
              <InfoRow label="Address" value={business.address || '—'} />
              <InfoRow label="Category" value={business.category || '—'} />
              <InfoRow
                label="Google Maps"
                value={
                  business.google_maps_url ? (
                    <a
                      href={business.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--brand-primary-light)', textDecoration: 'underline' }}
                    >
                      View on Maps ↗
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow
                label="Review Link"
                value={
                  business.google_review_url ? (
                    <a
                      href={business.google_review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--brand-primary-light)', textDecoration: 'underline' }}
                    >
                      Verify Review Link ↗
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow label="AI Highlights" value={business.custom_context || 'None set (click Edit to add)'} />
              <InfoRow label="Place ID" value={business.place_id || '—'} mono />
              <InfoRow label="Token" value={business.public_token} mono />
              <InfoRow label="Data Source" value={business.data_source} />
              {business.google_data_refreshed_at && (
                <InfoRow
                  label="Last Refreshed"
                  value={new Date(business.google_data_refreshed_at).toLocaleString()}
                />
              )}
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>QR Code & Downloads</h2>

          <div className="qr-preview-container">
            {qrDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUri}
                alt={`QR code for ${business.business_name}`}
                className="qr-preview-image"
                width={180}
                height={180}
              />
            ) : (
              <div
                className="qr-preview-image skeleton"
                style={{ width: 180, height: 180 }}
              />
            )}

            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
                {reviewPageUrl}
              </p>

              <div className="qr-download-buttons">
                <a
                  href={`/api/businesses/${id}/qr?size=1024`}
                  download
                  className="btn btn-secondary btn-sm"
                  id="download-qr-png-btn"
                >
                  ⬇ PNG
                </a>
                <a
                  href={`/api/businesses/${id}/qr?size=2048`}
                  download
                  className="btn btn-secondary btn-sm"
                >
                  ⬇ PNG 2K
                </a>
                <a
                  href={`/api/qr/pdf?businessId=${id}`}
                  download
                  className="btn btn-primary btn-sm"
                  id="download-qr-pdf-btn"
                >
                  ⬇ A4 PDF
                </a>
              </div>
            </div>

            <a
              href={`/r/${business.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              ↗ Open Public Review Page
            </a>
          </div>
        </div>

        {/* Review Destination */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Google Review Destination</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.25rem' }}>
                Google Review URL
              </div>
              <div style={{ wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--admin-text)' }}>
                {business.google_review_destination || business.google_review_url}
              </div>
            </div>

            {business.google_review_destination && (
              <a
                href={business.google_review_destination}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                id="open-google-review-btn"
              >
                ↗ Open Google Review Page
              </a>
            )}

            <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
              ℹ️ The QR code points to your permanent domain. You can update the Google destination without reprinting.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.875rem', gap: '1rem' }}>
      <span style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{
        color: 'var(--admin-text)',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? '0.8rem' : 'inherit',
        textAlign: 'right',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}
