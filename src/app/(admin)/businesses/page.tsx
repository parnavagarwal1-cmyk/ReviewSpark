'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import type { Business, PaginatedResponse, CreateBusinessInput } from '@/types';

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const PAGE_SIZE = 20;

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
      });
      const res = await fetch(`/api/businesses?${params}`);
      if (!res.ok) throw new Error('Failed to load businesses');
      const data: PaginatedResponse<Business> = await res.json();
      setBusinesses(data.data);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(loadBusinesses, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadBusinesses, search]);

  async function toggleActive(business: Business) {
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !business.is_active }),
      });
      if (!res.ok) throw new Error('Update failed');
      setBusinesses((prev) =>
        prev.map((b) => (b.id === business.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteBusiness(business: Business) {
    if (!confirm(`Delete "${business.business_name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/businesses/${business.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setBusinesses((prev) => prev.filter((b) => b.id !== business.id));
      setCount((c) => c - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Businesses</h1>
          <p className="page-subtitle">{count.toLocaleString()} client businesses</p>
        </div>
        <button
          id="add-business-btn"
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add Business
        </button>
      </div>

      {showAddForm && (
        <AddBusinessModal
          onClose={() => setShowAddForm(false)}
          onSuccess={(newBusiness) => {
            setBusinesses((prev) => [newBusiness, ...prev]);
            setCount((c) => c + 1);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
        <div className="search-bar">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search businesses…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search businesses"
            id="business-search-input"
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
          Loading businesses…
        </div>
      ) : businesses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            {search ? 'No businesses match your search.' : 'No businesses yet. Add your first client!'}
          </p>
          {!search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setShowAddForm(true)}
            >
              + Add First Business
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Token</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text)' }}>
                      {b.business_name}
                    </div>
                    {b.address && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                        {b.address.slice(0, 60)}{b.address.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', color: 'var(--brand-primary-light)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {b.public_token}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${b.data_source === 'google_places' ? 'badge-info' : 'badge-warning'}`}>
                      {b.data_source === 'google_places' ? '🔍 Google' : '✏️ Manual'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}
                      onClick={() => toggleActive(b)}
                      title={b.is_active ? 'Click to deactivate' : 'Click to activate'}
                      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      {b.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <Link
                        href={`/businesses/${b.id}`}
                        className="btn btn-secondary btn-sm"
                        id={`view-business-${b.id}`}
                      >
                        View
                      </Link>
                      <a
                        href={`/r/${b.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        title="Open public review page"
                      >
                        ↗
                      </a>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteBusiness(b)}
                        id={`delete-business-${b.id}`}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem', padding: '0 var(--space-sm)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

// ── Add Business Modal ────────────────────────────────────────────────────

interface AddBusinessModalProps {
  onClose: () => void;
  onSuccess: (business: Business) => void;
}

function AddBusinessModal({ onClose, onSuccess }: AddBusinessModalProps) {
  const [googleUrl, setGoogleUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsManual, setNeedsManual] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body: CreateBusinessInput = {
        google_review_url: googleUrl,
        business_name: businessName.trim() || undefined,
        address: address.trim() || undefined,
        category: category.trim() || undefined,
        custom_context: customContext.trim() || undefined,
      };

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needs_manual_entry) {
          setNeedsManual(true);
          setError(data.error);
        } else {
          setError(data.error ?? 'Failed to create business');
        }
        return;
      }

      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-business-modal-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 id="add-business-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Add New Business
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="google-url-input">
              Google Review URL *
            </label>
            <input
              id="google-url-input"
              type="url"
              className="form-input"
              placeholder="https://maps.google.com/maps/place/..."
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              required
              autoFocus
            />
            <span className="form-hint">
              Paste the client&apos;s Google Maps or Google Review URL. We&apos;ll resolve the business details automatically.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="business-name-input">
              Business Name {needsManual ? '*' : '(Optional — auto-detected if empty)'}
            </label>
            <input
              id="business-name-input"
              type="text"
              className="form-input"
              placeholder="e.g. Sharma Sweets"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required={needsManual}
            />
            <span className="form-hint">
              {needsManual
                ? 'Please enter the client business name to complete setup.'
                : 'Leave blank to auto-detect from Google Maps URL, or type it here.'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="custom-context-input">
              ✨ Business Details &amp; Highlights (Optional)
            </label>
            <textarea
              id="custom-context-input"
              className="form-input"
              rows={2}
              placeholder="e.g. Famous for Paneer Butter Masala &amp; Garlic Naan, quick home delivery, valet parking"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
            />
            <span className="form-hint">
              Add popular dishes, key services, or specialties to make AI-generated reviews feel authentic and personalized.
            </span>
          </div>

          {needsManual && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="address-input">Address (Optional)</label>
                <input
                  id="address-input"
                  type="text"
                  className="form-input"
                  placeholder="123 MG Road, Bengaluru"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="category-input">Category (Optional)</label>
                <input
                  id="category-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Restaurant, Salon, Clinic"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !googleUrl || (needsManual && !businessName.trim())}
              id="add-business-submit-btn"
              style={{ flex: 1 }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Adding Business…
                </>
              ) : (
                'Add Business'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
