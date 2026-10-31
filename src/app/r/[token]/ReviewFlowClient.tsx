'use client';

import { useState, useEffect, useRef } from 'react';

interface BusinessContext {
  business_name: string;
  address: string | null;
  category: string | null;
  google_review_destination: string;
  public_token: string;
  aspects?: string[];
  rating_tags?: Record<string, string[]>;
  show_aspects?: boolean;
  show_tags?: boolean;
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

  // Selected Aspects and Tags
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [drafts, setDrafts] = useState<[string, string] | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<0 | 1>(0);
  const [editedDraft, setEditedDraft] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  function toggleAspect(aspect: string) {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleGenerate(ratingToUse = selectedRating) {
    if (!ratingToUse) return;
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
          rating: ratingToUse,
          customer_note: customerNote.trim() || undefined,
          selected_aspects: selectedAspects,
          selected_tags: selectedTags,
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

  function handleRatingClick(star: number) {
    setSelectedRating(star);
    // Reset tags when rating changes to match the new star level
    setSelectedTags([]);
  }

  function handleSelectDraft(index: 0 | 1) {
    setSelectedDraftIndex(index);
    setEditedDraft(drafts![index]);
  }

  async function handleRegenerate() {
    if (!selectedRating || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/review/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating: selectedRating,
          customer_note: customerNote.trim() || undefined,
          selected_aspects: selectedAspects,
          selected_tags: selectedTags,
        }),
      });

      const data = await res.json();
      if (res.ok && data.drafts) {
        setDrafts(data.drafts);
        setEditedDraft(data.drafts[selectedDraftIndex]);
      }
    } catch {
      // keep existing drafts
    } finally {
      setIsRegenerating(false);
    }
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
      // Fallback
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

  const activeStarTags =
    selectedRating > 0 && context?.rating_tags
      ? context.rating_tags[String(selectedRating)] || []
      : [];

  const businessInitial = context?.business_name ? context.business_name.trim().charAt(0).toUpperCase() : 'B';

  if (step === 'loading') {
    return (
      <div className="public-page" role="status" aria-live="polite">
        <div className="review-container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 36, height: 36, borderWidth: 3, borderTopColor: '#6366f1' }} />
          <p style={{ color: '#8e93a7', fontSize: '0.95rem' }}>Loading review page…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="public-page" role="alert">
        <div className="review-container">
          <div className="review-google-hero-card" style={{ padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Page Unavailable
            </h2>
            <p style={{ color: '#8e93a7', fontSize: '0.875rem' }}>
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
        <div className="review-container">
          {/* Top Identity */}
          <div className="review-top-identity">
            <div className="review-avatar">{businessInitial}</div>
            <div className="review-identity-info">
              <h1 className="review-identity-name">{context?.business_name}</h1>
              <span className="review-category-pill">{context?.category || 'Service Based Business'}</span>
            </div>
          </div>

          <div className="review-google-hero-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Thank You!
            </h2>
            <p style={{ color: '#8e93a7', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Google should have opened in a new tab. Paste your review text there and submit!
            </p>
            <button
              className="btn-generate-active"
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
            <p style={{ color: '#686d85', fontSize: '0.75rem', marginTop: '1.25rem' }}>
              Your review has NOT been submitted yet. Please paste it on Google and click Post.
            </p>
          </div>

          {/* Footer */}
          <div className="review-powered-by">
            <span>Powered by</span>
            <span className="spark-logo-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#6366f1">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
              ReviewSpark
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="review-container">
        {/* Top Business Identity Section */}
        <div className="review-top-identity">
          <div className="review-avatar">
            {businessInitial}
          </div>
          <div className="review-identity-info">
            <h1 className="review-identity-name">{context?.business_name || 'Business'}</h1>
            <span className="review-category-pill">
              {context?.category || 'Service Based Business'}
            </span>
          </div>
        </div>

        {/* Step: Select Rating & Configure Aspects / Tags */}
        {(step === 'select-rating' || step === 'generating') && (
          <>
            {/* Center Google Hero Card */}
            <div className="review-google-hero-card">
              <div className="review-hero-label">YOUR REVIEW WILL BE POSTED ON</div>
              <div className="review-hero-google" aria-label="Google">
                <span style={{ color: '#4285F4' }}>G</span>
                <span style={{ color: '#EA4335' }}>o</span>
                <span style={{ color: '#FBBC05' }}>o</span>
                <span style={{ color: '#4285F4' }}>g</span>
                <span style={{ color: '#34A853' }}>l</span>
                <span style={{ color: '#EA4335' }}>e</span>
              </div>
              <div className="review-hero-sub">Takes only 10 seconds</div>
            </div>

            {/* Experience & Star Rating Section */}
            <div className="review-experience-section">
              <h2 className="review-experience-title">
                {step === 'generating' ? 'Generating AI review drafts…' : 'How was your experience?'}
              </h2>

              {/* 5-Star Row */}
              <div className="stars-row" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || selectedRating);
                  return (
                    <button
                      key={star}
                      className={`star-btn ${isFilled ? 'filled' : ''}`}
                      onClick={() => step === 'select-rating' && handleRatingClick(star)}
                      onMouseEnter={() => step === 'select-rating' && setHoverRating(star)}
                      onMouseLeave={() => step === 'select-rating' && setHoverRating(0)}
                      disabled={step === 'generating'}
                      role="radio"
                      aria-checked={star === selectedRating}
                      aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                      id={`star-btn-${star}`}
                    >
                      <svg
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill={isFilled ? '#f59e0b' : 'none'}
                        stroke={isFilled ? '#f59e0b' : '#32344f'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: 'all 0.15s ease',
                          filter: isFilled ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))' : 'none',
                          transform: isFilled ? 'scale(1.08)' : 'scale(1)',
                        }}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              {/* Feedback text */}
              {selectedRating > 0 && (
                <div style={{ marginTop: '0.65rem', fontSize: '0.85rem', color: '#a0a5bc', fontWeight: 500 }}>
                  {STAR_LABELS[hoverRating || selectedRating]}
                </div>
              )}

              {/* Aspects & Tags & Note (when rating selected) */}
              {selectedRating > 0 && step === 'select-rating' && (
                <div className="review-customization-box">
                  {/* Aspects Selection (if enabled) */}
                  {context?.show_aspects !== false && context?.aspects && context.aspects.length > 0 && (
                    <div>
                      <span className="box-section-title">⭐ Select what stood out:</span>
                      <div className="chips-row">
                        {context.aspects.map((aspect, idx) => {
                          const isSelected = selectedAspects.includes(aspect);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleAspect(aspect)}
                              className={`custom-chip ${isSelected ? 'selected' : ''}`}
                            >
                              {isSelected ? `✓ ${aspect}` : `+ ${aspect}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rating Tags Selection (if enabled) */}
                  {context?.show_tags !== false && activeStarTags.length > 0 && (
                    <div>
                      <span className="box-section-title">🏷️ Quick highlights:</span>
                      <div className="chips-row">
                        {activeStarTags.map((tag, idx) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`custom-chip tag-chip ${isSelected ? 'selected' : ''}`}
                            >
                              {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Customer Personal Note */}
                  <div>
                    <label htmlFor="customer-note-input" className="box-section-title">
                      ✍️ Anything specific to mention? (Optional)
                    </label>
                    <input
                      id="customer-note-input"
                      type="text"
                      className="custom-note-input"
                      placeholder="e.g. Loved Dr. Sharma's gentle approach, quick service"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {generateError && step === 'select-rating' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', fontSize: '0.85rem', color: '#fca5a5', textAlign: 'center' }}>
                  {generateError}
                </div>
              )}
            </div>

            {/* Bottom Button */}
            <div style={{ marginTop: '0.5rem' }}>
              {selectedRating === 0 ? (
                <button
                  type="button"
                  className="btn-rate-to-continue"
                  disabled
                >
                  <span style={{ color: '#f59e0b' }}>★</span> Rate to continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-generate-active"
                  onClick={() => handleGenerate()}
                  disabled={step === 'generating'}
                >
                  {step === 'generating' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Drafting English &amp; Hinglish reviews…
                    </span>
                  ) : (
                    '✨ Continue to Review (English & Hinglish)'
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {/* Step: Select & Edit Draft */}
        {step === 'select-draft' && (
          <div className="review-google-hero-card" style={{ textAlign: 'left', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', color: '#f59e0b' }}>
                  {'★'.repeat(selectedRating)}{'☆'.repeat(5 - selectedRating)}
                </span>
                <span style={{ color: '#a0a5bc', fontSize: '0.85rem', fontWeight: 500 }}>
                  {STAR_LABELS[selectedRating]}
                </span>
              </div>
              <button
                style={{ fontSize: '0.78rem', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setStep('select-rating'); }}
              >
                Change Rating
              </button>
            </div>

            {aiUnavailable || !drafts ? (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', fontSize: '0.85rem', color: '#fbbf24', marginBottom: '1rem' }}>
                  ✍️ AI suggestions unavailable. Write your own review below.
                </div>
                <div className="dark-draft-card selected">
                  <textarea
                    className="dark-draft-textarea"
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
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#8c90a4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    🤖 Pick Your Language
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    title="Generate completely new reviews with different style and length"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#a5b4fc',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      padding: '3px 10px',
                      cursor: isRegenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isRegenerating ? (
                      <>
                        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                        Fresh ideas…
                      </>
                    ) : (
                      <>🔄 Fresh Ideas</>
                    )}
                  </button>
                </div>

                {drafts.map((draft, i) => {
                  const isEnglish = i === 0;
                  const isSelected = selectedDraftIndex === i;
                  return (
                    <div
                      key={i}
                      className={`dark-draft-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectDraft(i as 0 | 1)}
                      id={`draft-option-${i}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: isSelected ? '#a5b4fc' : '#8c90a4',
                          }}
                        >
                          Draft {i + 1} ({isEnglish ? 'English' : 'Hinglish'})
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isEnglish ? 'rgba(79, 70, 229, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isEnglish ? '#c7d2fe' : '#fde68a',
                            fontWeight: 600,
                          }}
                        >
                          {isEnglish ? '🇬🇧 English' : '🇮🇳 Hinglish'}
                        </span>
                      </div>

                      {isSelected ? (
                        <textarea
                          className="dark-draft-textarea"
                          value={editedDraft}
                          onChange={(e) => setEditedDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          rows={Math.max(3, Math.ceil(editedDraft.length / 50))}
                          aria-label={`Edit draft option ${i + 1}`}
                          id={`draft-edit-${i}`}
                        />
                      ) : (
                        <p className="dark-draft-text">{draft}</p>
                      )}
                    </div>
                  );
                })}

                <div style={{ fontSize: '0.75rem', color: '#686d85', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.75rem' }}>
                  <span>ℹ️</span>
                  <span>Feel free to tap and edit anything before posting!</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                className={`btn-public-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                disabled={!editedDraft.trim()}
                id="copy-draft-btn"
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 1-Click Copy Review'}
              </button>
            </div>

            <button
              className="btn-generate-active"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={handleContinueToGoogle}
              id="continue-to-google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              </svg>
              Continue to Google Review →
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#686d85', marginTop: '0.75rem' }}>
              Click &quot;Copy&quot; above, then paste into Google Maps and hit Post!
            </p>
          </div>
        )}

        {/* Footer / Powered By */}
        <div className="review-powered-by">
          <span>Powered by</span>
          <span className="spark-logo-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#6366f1">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
            ReviewSpark
          </span>
        </div>
      </div>
    </div>
  );
}
