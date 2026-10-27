'use client';

import { useState, useEffect, useRef } from 'react';

interface BusinessContext {
  business_name: string;
  address: string | null;
  category: string | null;
  google_review_destination: string;
  public_token: string;
  _bid: string;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent!',
};

type Step = 'loading' | 'error' | 'select-rating' | 'generating' | 'select-draft' | 'continue';

export default function ReviewFlowClient({ token }: { token: string }) {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<Step>('loading');

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerNote, setCustomerNote] = useState('');

  const [drafts, setDrafts] = useState<[string, string] | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<0 | 1>(0);
  const [editedDraft, setEditedDraft] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load business context
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/review/context?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? 'This review page is unavailable.');
          setStep('error');
          return;
        }
        setContext(data);
        setStep('select-rating');
      } catch {
        setLoadError('Network error. Please check your connection.');
        setStep('error');
      }
    }
    load();
  }, [token]);

  async function handleRatingSelect(rating: number) {
    setSelectedRating(rating);
    setDrafts(null);
    setEditedDraft('');
    setGenerateError('');
    setStep('generating');

    try {
      const res = await fetch('/api/review/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating,
          customer_note: customerNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.ai_unavailable) {
          setAiUnavailable(true);
          setGenerateError(data.error ?? 'AI unavailable');
          setStep('select-draft');
          return;
        }
        setGenerateError(data.error ?? 'Failed to generate suggestions');
        setStep('select-rating');
        return;
      }

      setDrafts(data.drafts);
      setSelectedDraftIndex(0);
      setEditedDraft(data.drafts[0]);
      setStep('select-draft');
    } catch {
      setGenerateError('Network error. Please try again.');
      setStep('select-rating');
    }
  }

  function handleSelectDraft(index: 0 | 1) {
    setSelectedDraftIndex(index);
    setEditedDraft(drafts![index]);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editedDraft);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);

      // Record copy event
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, event_type: 'copy_click', rating: selectedRating }),
      }).catch(() => {});
    } catch {
      // Clipboard API unavailable (some browsers/contexts)
    }
  }

  function handleContinueToGoogle() {
    if (!context?.google_review_destination) return;

    // Record continue event
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event_type: 'continue_to_google', rating: selectedRating }),
    }).catch(() => {});

    // Open Google review page in new tab
    window.open(context.google_review_destination, '_blank', 'noopener,noreferrer');
    setStep('continue');
  }

  if (step === 'loading') {
    return (
      <div className="public-page" role="status" aria-live="polite">
        <div className="review-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem', width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ color: 'var(--public-text-muted)' }}>Loading review page…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="public-page" role="alert">
        <div className="review-card">
          <div className="review-card-header">
            <div className="review-business-name">Review Page</div>
          </div>
          <div className="review-card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <p style={{ color: 'var(--public-text)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Page Unavailable
            </p>
            <p style={{ color: 'var(--public-text-muted)', fontSize: '0.875rem' }}>
              {loadError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'continue') {
    return (
      <div className="public-page">
        <div className="review-card">
          <div className="review-card-header">
            <div className="review-google-badge">📍 Google Review</div>
            <div className="review-business-name">{context?.business_name}</div>
          </div>
          <div className="review-card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontWeight: 700, color: 'var(--public-text)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Thank You!
            </h2>
            <p style={{ color: 'var(--public-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Google should have opened in a new tab. Paste your review text there and submit!
            </p>
            <button
              className="btn-public-google"
              onClick={handleContinueToGoogle}
              id="retry-google-btn"
            >
              ↗ Open Google Again
            </button>
            <button
              className="btn-public-copy"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={handleCopy}
              id="copy-review-again-btn"
            >
              {copied ? '✓ Copied!' : '📋 Copy Review Text Again'}
            </button>
            <p style={{ color: 'var(--public-text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              Your review has NOT been submitted yet. Please paste it on Google and click Post.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="review-card">
        {/* Header */}
        <div className="review-card-header">
          <div className="review-google-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Review
          </div>
          <div className="review-business-name">{context?.business_name}</div>
          {context?.address && (
            <div className="review-business-address">{context.address}</div>
          )}
        </div>

        {/* Body */}
        <div className="review-card-body">

          {/* Step: Select Rating */}
          {(step === 'select-rating' || step === 'generating') && (
            <div className="star-rating-container">
              <p className="star-rating-label">
                {step === 'generating'
                  ? 'Generating AI suggestions…'
                  : 'How was your experience?'}
              </p>

              <div className="stars-row" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${
                      star <= (hoverRating || selectedRating) ? 'filled' : ''
                    } ${star <= hoverRating ? 'preview' : ''}`}
                    onClick={() => step === 'select-rating' && handleRatingSelect(star)}
                    onMouseEnter={() => step === 'select-rating' && setHoverRating(star)}
                    onMouseLeave={() => step === 'select-rating' && setHoverRating(0)}
                    disabled={step === 'generating'}
                    role="radio"
                    aria-checked={star === selectedRating}
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                    id={`star-btn-${star}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="star-rating-text" aria-live="polite">
                {step === 'generating' ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span className="spinner spinner-dark" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Creating suggestions for you…
                  </span>
                ) : (
                  STAR_LABELS[hoverRating || selectedRating] ?? 'Tap a star to rate'
                )}
              </div>

              {step === 'select-rating' && (
                <div style={{ marginTop: '1.25rem', textAlign: 'left', width: '100%', maxWidth: '340px', margin: '1.25rem auto 0' }}>
                  <label htmlFor="customer-note-input" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--public-text)', display: 'block', marginBottom: '0.35rem' }}>
                    ✍️ Add specific details or dishes? (Optional)
                  </label>
                  <input
                    id="customer-note-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Loved the Butter Chicken, fast delivery"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#1e293b', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--public-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Tap a star above and AI will personalize your review with this!
                  </span>
                </div>
              )}

              {generateError && step === 'select-rating' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.85rem', color: '#991b1b', textAlign: 'center' }}>
                  {generateError}
                </div>
              )}
            </div>
          )}

          {/* Step: Select & Edit Draft */}
          {step === 'select-draft' && (
            <>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {'★'.repeat(selectedRating)}{'☆'.repeat(5 - selectedRating)}
                  </span>
                  <span style={{ color: 'var(--public-text-muted)', fontSize: '0.875rem' }}>
                    {STAR_LABELS[selectedRating]}
                  </span>
                  <button
                    style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { setStep('select-rating'); setSelectedRating(0); }}
                  >
                    Change
                  </button>
                </div>
              </div>

              {aiUnavailable || !drafts ? (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="alert alert-warning" style={{ fontSize: '0.85rem' }}>
                    ✍️ AI suggestions unavailable. Write your own review below.
                  </div>
                  <div className="draft-card selected">
                    <textarea
                      className="draft-edit-area"
                      value={editedDraft}
                      onChange={(e) => setEditedDraft(e.target.value)}
                      placeholder="Write your review here…"
                      rows={4}
                      aria-label="Write your review"
                      id="manual-review-textarea"
                    />
                  </div>
                </div>
              ) : (
                <div className="drafts-section">
                  <div className="drafts-label">
                    🤖 AI Suggestions
                    <span style={{ fontSize: '0.7rem', color: 'var(--public-text-muted)', fontWeight: 400, textTransform: 'none' }}>
                      — edit before posting
                    </span>
                  </div>

                  {drafts.map((draft, i) => (
                    <div
                      key={i}
                      className={`draft-card ${selectedDraftIndex === i ? 'selected' : ''}`}
                      onClick={() => handleSelectDraft(i as 0 | 1)}
                      id={`draft-option-${i}`}
                    >
                      <div className="draft-card-label">Option {i + 1}</div>
                      {selectedDraftIndex === i ? (
                        <textarea
                          className="draft-edit-area"
                          value={editedDraft}
                          onChange={(e) => setEditedDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          rows={Math.max(3, Math.ceil(editedDraft.length / 60))}
                          aria-label={`Edit draft option ${i + 1}`}
                          id={`draft-edit-${i}`}
                        />
                      ) : (
                        <p className="draft-text">{draft}</p>
                      )}
                    </div>
                  ))}

                  <div className="ai-disclaimer" aria-label="AI disclosure">
                    <span aria-hidden="true">ℹ️</span>
                    These are AI-generated suggestions. Please personalise before posting.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="draft-actions">
                <button
                  className={`btn-public-copy ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                  disabled={!editedDraft.trim()}
                  id="copy-draft-btn"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>

              <button
                className="btn-public-google"
                style={{ marginTop: 'var(--space-md)' }}
                onClick={handleContinueToGoogle}
                id="continue-to-google-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                </svg>
                Continue to Google →
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--public-text-muted)', marginTop: '0.75rem' }}>
                Copy your review text first, then paste it on Google.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
