'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Hero Demo State
  const [demoRating, setDemoRating] = useState(5);
  const [demoSelectedDraft, setDemoSelectedDraft] = useState<0 | 1>(0);
  const [demoCopied, setDemoCopied] = useState(false);

  const demoDrafts = [
    {
      lang: 'English',
      badge: '🇬🇧 English',
      text: 'Visited today for service. The team was prompt, highly professional, and hygiene was top notch. Will definitely visit again!',
    },
    {
      lang: 'Hinglish',
      badge: '🇮🇳 Hinglish',
      text: 'Bohot hi badhiya experience tha! Staff super polite hai aur bilkul wait nahi karna pada. 5-star service 👍',
    },
  ];

  function handleDemoCopy() {
    setDemoCopied(true);
    setTimeout(() => setDemoCopied(false), 2000);
  }

  const faqs = [
    {
      q: 'What are Google Business AI reviews?',
      a: 'Google Business AI reviews are genuine Google Maps reviews where happy customers get an AI-drafted suggestion in English or Hinglish that they can easily edit before posting to your Google Business Profile. ReviewSpark never auto-posts or generates fake reviews — customers scan your QR, rate their visit, and submit the review themselves.',
    },
    {
      q: 'Do customers need to download an app to leave a review?',
      a: 'No app is required! When a customer scans your QR code using their default phone camera, it instantly opens in their mobile browser (Chrome, Safari, etc.) within seconds.',
    },
    {
      q: 'How does the AI review generator work?',
      a: 'When a customer gives a 4 or 5-star rating, ReviewSpark dynamically generates two authentic review options: Draft 1 in clean English and Draft 2 in conversational Hinglish. The customer can tap either draft, edit it if they want, and copy it directly to Google Maps in 1 click.',
    },
    {
      q: 'How does the negative review filter (private feedback) work?',
      a: 'If a customer had a less-than-ideal experience and rates 1 to 3 stars, they are gently guided to an internal private feedback form. Their concerns go straight to your private dashboard inbox, allowing you to resolve the problem privately before it turns into a damaging public 1-star review on Google.',
    },
    {
      q: 'Is ReviewSpark compliant with Google policies?',
      a: 'Yes, 100%. ReviewSpark never offers gifts or discounts for reviews, never auto-posts on behalf of users, and never posts bot-generated content. Real customers write, edit, and post the reviews themselves from their personal Google accounts.',
    },
    {
      q: 'How long does it take to set up?',
      a: 'Less than 2 minutes! You simply sign in to your dashboard, search or paste your Google Business listing, download your printable QR code, and put it on your counter.',
    },
    {
      q: 'Can I use ReviewSpark for multiple branches or locations?',
      a: 'Yes! ReviewSpark supports multi-location businesses. You can manage separate QR codes, track reviews, and monitor analytics for all your branches from a single unified dashboard.',
    },
  ];

  const industries = [
    { name: 'Restaurants & Cafés', icon: '🍽️', placement: 'QR on tables & bill folders' },
    { name: 'Salons & Spas', icon: '💇', placement: 'QR at mirrors & reception' },
    { name: 'Dental & Medical Clinics', icon: '🩺', placement: 'QR at checkout & consultation' },
    { name: 'Gyms & Fitness Centers', icon: '🏋️', placement: 'QR at check-in desk' },
    { name: 'Coaching & Institutes', icon: '📚', placement: 'QR at reception & classrooms' },
    { name: 'Hotels & Resorts', icon: '🏨', placement: 'QR at front desk & rooms' },
    { name: 'Car & Bike Service', icon: '🚗', placement: 'QR on customer invoice & billing' },
    { name: 'Retail & Boutiques', icon: '🛍️', placement: 'QR at billing checkout' },
  ];

  return (
    <div className="landing-root">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-container header-inner">
          <Link href="/" className="landing-logo">
            <span className="logo-spark-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#6366f1">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </span>
            <span className="logo-text">
              Review<span className="logo-accent">Spark</span>
            </span>
          </Link>

          <nav className="desktop-nav">
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>

          <div className="header-actions">
            <Link href="/login" className="btn-nav-login">
              Login
            </Link>
            <Link href="/login" className="btn-nav-primary">
              Start Free
            </Link>
            <button
              type="button"
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu-drawer">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Link href="/login" className="btn-nav-login" style={{ flex: 1, textAlign: 'center' }}>
                Login
              </Link>
              <Link href="/login" className="btn-nav-primary" style={{ flex: 1, textAlign: 'center' }}>
                Start Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="landing-container hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-spark">✨</span>
              <span>AI-Powered Google Review Platform</span>
            </div>

            <h1 className="hero-title">
              Google Business AI reviews from <span className="gradient-text">one QR code</span>
            </h1>

            <p className="hero-subtitle">
              ReviewSpark turns one QR code at your counter into editable AI review drafts in English &amp; Hinglish for happy customers. Low ratings stay in your private inbox. Never auto-post.
            </p>

            <div className="hero-cta-group">
              <Link href="/login" className="btn-hero-primary">
                Start Free — 1 Min Setup
              </Link>
              <a
                href="https://wa.me/919044875974?text=Hi%2C%20I%20want%20to%20set%20up%20ReviewSpark%20for%20my%20business"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-secondary"
              >
                <span style={{ fontSize: '1.1rem' }}>💬</span> WhatsApp Setup Help
              </a>
            </div>

            <div className="hero-trust-row">
              <span className="trust-item">✓ Free to start</span>
              <span className="trust-item">✓ No credit card needed</span>
              <span className="trust-item">✓ 100% Google Compliant</span>
            </div>
          </div>

          {/* Interactive Live Demo Phone Card */}
          <div className="hero-visual">
            <div className="demo-stand-wrapper">
              <div className="demo-card-glow"></div>
              
              <div className="demo-phone-card">
                {/* Header inside phone */}
                <div className="demo-biz-header">
                  <div className="demo-biz-avatar">S</div>
                  <div>
                    <div className="demo-biz-name">Sharma Dental Clinic</div>
                    <div className="demo-biz-cat">Healthcare &amp; Dental</div>
                  </div>
                </div>

                {/* Google Hero Box */}
                <div className="demo-google-box">
                  <span className="demo-google-sub">YOUR REVIEW WILL BE POSTED ON</span>
                  <div className="demo-google-logo">
                    <span style={{ color: '#4285F4' }}>G</span>
                    <span style={{ color: '#EA4335' }}>o</span>
                    <span style={{ color: '#FBBC05' }}>o</span>
                    <span style={{ color: '#4285F4' }}>g</span>
                    <span style={{ color: '#34A853' }}>l</span>
                    <span style={{ color: '#EA4335' }}>e</span>
                  </div>
                  <span className="demo-google-sec">Takes only 10 seconds</span>
                </div>

                {/* Interactive Star Row */}
                <div className="demo-stars-box">
                  <div className="demo-stars-title">How was your experience?</div>
                  <div className="demo-stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDemoRating(star)}
                        className={`demo-star-btn ${star <= demoRating ? 'active' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drafts Simulation */}
                {demoRating >= 4 ? (
                  <div className="demo-drafts-container">
                    <div className="demo-draft-header">
                      <span>🤖 AI DRAFTS READY</span>
                      <span className="demo-draft-pill">Tap to pick</span>
                    </div>

                    {demoDrafts.map((d, i) => (
                      <div
                        key={i}
                        onClick={() => setDemoSelectedDraft(i as 0 | 1)}
                        className={`demo-draft-item ${demoSelectedDraft === i ? 'selected' : ''}`}
                      >
                        <div className="demo-draft-badge">{d.badge}</div>
                        <p className="demo-draft-text">{d.text}</p>
                      </div>
                    ))}

                    <button type="button" onClick={handleDemoCopy} className="demo-copy-btn">
                      {demoCopied ? '✓ Copied to Clipboard!' : '📋 1-Click Copy & Continue'}
                    </button>
                  </div>
                ) : (
                  <div className="demo-private-box">
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    <div className="demo-private-title">Private Feedback Shield Active</div>
                    <p className="demo-private-desc">
                      1-3★ reviews are kept private in your inbox so you can resolve issues without damaging your Google rating!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 Value Pillars ─────────────────────────────────────────────── */}
      <section className="pillars-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Core Philosophy</span>
            <h2 className="section-title">
              A Google review QR at your counter.<br />A cleaner Google rating.
            </h2>
            <p className="section-desc">
              ReviewSpark is built for Indian local businesses: one printed QR, an AI review generator for happy customers, and private feedback for low ratings.
            </p>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card">
              <div className="pillar-num">01</div>
              <div className="pillar-tag">Happy Visits</div>
              <h3 className="pillar-heading">AI Review Generator for Google Maps</h3>
              <p className="pillar-text">
                Customers scan your QR code, rate 4 or 5 stars, pick an AI review draft in pure English or natural conversational Hinglish, and post on Google Maps themselves.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-num">02</div>
              <div className="pillar-tag">Tough Visits</div>
              <h3 className="pillar-heading">Private Feedback Before a Public Review</h3>
              <p className="pillar-text">
                1-3 star ratings go straight to your private dashboard inbox — not a public Google Business Profile review. You get the opportunity to fix customer issues first.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-num">03</div>
              <div className="pillar-tag">Your Reputation</div>
              <h3 className="pillar-heading">QR Review System You Print Once</h3>
              <p className="pillar-text">
                ReviewSpark never auto-posts or fakes reviews. Customers review directly in their phone browser without downloading any mobile app. One printed QR does the heavy lifting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Step-By-Step</span>
            <h2 className="section-title">How a Google review QR code works</h2>
            <p className="section-desc">
              Scan. Rate. Then it splits. Happy visits go to Google Maps with an AI review draft. Tough visits stay private.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-badge">01</div>
              <h4 className="step-title">Customer Scans Your QR</h4>
              <p className="step-text">No app download needed. Works directly in standard phone cameras and browsers.</p>
            </div>

            <div className="step-card">
              <div className="step-badge">02</div>
              <h4 className="step-title">They Rate 1 to 5 Stars</h4>
              <p className="step-text">Fast, tap-friendly star selection that matches standard Google review expectations.</p>
            </div>

            <div className="step-card highlight-orange">
              <div className="step-badge">03</div>
              <h4 className="step-title">1–3★ Stays Private</h4>
              <p className="step-text">Negative feedback is redirected to your private dashboard inbox. Never posted to Google.</p>
            </div>

            <div className="step-card highlight-blue">
              <div className="step-badge">04</div>
              <h4 className="step-title">4–5★ AI Draft on Google</h4>
              <p className="step-text">Customers get instant English &amp; Hinglish suggestions, copy with 1 click, and post to Google Maps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Heavy-Lifting Features ─────────────────────────────────── */}
      <section id="features" className="features-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Features</span>
            <h2 className="section-title">Three features that do the heavy lifting</h2>
            <p className="section-desc">
              No complicated dashboard to babysit. ReviewSpark runs quietly in the background and keeps your reputation growing.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">🖨️</div>
              <h3 className="feature-title">Counter QR Code System</h3>
              <p className="feature-text">
                One Google review QR code for every customer. Print it once, place it on your checkout counter, tables, or bills.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🛡️</div>
              <h3 className="feature-title">Negative Review Shield</h3>
              <p className="feature-text">
                Low ratings are intercepted in your private feedback inbox so you can resolve customer complaints before they harm your public score.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">✍️</div>
              <h3 className="feature-title">English &amp; Hinglish AI Generator</h3>
              <p className="feature-text">
                Customers who don&apos;t know what to write get two authentic AI suggestions — one in natural English and one in conversational Hinglish.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Built For Every Business ─────────────────────────────────────── */}
      <section className="industries-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Universal Solution</span>
            <h2 className="section-title">Google review QR for every shop</h2>
            <p className="section-desc">
              Same QR. Different counter. Restaurants, salons, clinics, and every local business across India.
            </p>
          </div>

          <div className="industries-grid">
            {industries.map((item, idx) => (
              <div key={idx} className="industry-card">
                <span className="ind-icon">{item.icon}</span>
                <div className="ind-name">{item.name}</div>
                <div className="ind-placement">{item.placement}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────────── */}
      <section id="pricing" className="pricing-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Pricing</span>
            <h2 className="section-title">Start free. Upgrade when you need more locations.</h2>
            <p className="section-desc">
              Free for a single shop. Growth plan when you want multi-location management and advanced features.
            </p>

            {/* Billing Toggle */}
            <div className="pricing-toggle-wrapper">
              <button
                type="button"
                className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual <span className="discount-tag">20% OFF</span>
              </button>
            </div>
          </div>

          <div className="pricing-cards-grid">
            {/* Free Plan */}
            <div className="pricing-card">
              <div className="plan-badge">Start Here</div>
              <h3 className="plan-name">Free</h3>
              <p className="plan-desc">Try ReviewSpark with one location. No card needed.</p>
              <div className="plan-price">
                <span className="price-currency">₹</span>
                <span className="price-val">0</span>
                <span className="price-period">/ forever</span>
              </div>

              <Link href="/login" className="btn-plan-outline">
                Start Free
              </Link>

              <ul className="plan-features">
                <li>✓ Unlimited QR scans</li>
                <li>✓ 1 business location</li>
                <li>✓ Dual English &amp; Hinglish AI drafts</li>
                <li>✓ Aspect chips &amp; rating tags</li>
                <li>✓ Printable QR code PDF download</li>
                <li>✓ Basic analytics</li>
                <li>✓ Google Places automatic lookup</li>
              </ul>
            </div>

            {/* Growth Plan */}
            <div className="pricing-card popular">
              <div className="popular-ribbon">Most Popular</div>
              <div className="plan-badge gradient">For Scaling Businesses</div>
              <h3 className="plan-name">Growth</h3>
              <p className="plan-desc">For chains, clinics, and multi-location businesses.</p>
              <div className="plan-price">
                <span className="price-currency">₹</span>
                <span className="price-val">{billingCycle === 'annual' ? '319' : '399'}</span>
                <span className="price-period">/ month</span>
              </div>
              <div className="plan-billing-note">
                {billingCycle === 'annual' ? 'Billed ₹3,828/year (Save 20%)' : 'Billed monthly'}
              </div>

              <Link href="/login" className="btn-plan-solid">
                Get Growth Plan
              </Link>

              <ul className="plan-features">
                <li>✓ Everything in Free Plan</li>
                <li>✓ Multi-location business capacity</li>
                <li>✓ Full private feedback inbox &amp; alert routing</li>
                <li>✓ Local SEO keyword incorporation</li>
                <li>✓ Advanced analytics &amp; conversion metrics</li>
                <li>✓ Priority WhatsApp &amp; phone support</li>
                <li>✓ Custom review threshold per branch</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section id="faq" className="faq-section">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">FAQ</span>
            <h2 className="section-title">Questions owners actually ask</h2>
            <p className="section-desc">
              QR scan, AI drafts, private inbox, Google Maps. Nothing auto-posts.
            </p>
          </div>

          <div className="faq-accordion">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span className="faq-num">0{index + 1}</span>
                    <span className="faq-question-text">{faq.q}</span>
                    <span className="faq-chevron">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <div className="faq-answer">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action ───────────────────────────────────────── */}
      <section className="bottom-cta-section">
        <div className="landing-container bottom-cta-inner">
          <h2 className="bottom-cta-title">
            Put one QR on the counter.<br />
            <span className="gradient-text">Google reviews follow.</span>
          </h2>
          <p className="bottom-cta-desc">
            Happy customers get an AI draft and post on Google Maps. 1-3 stars stay in your private inbox. You never auto-post.
          </p>
          <Link href="/login" className="btn-hero-primary bottom-cta-btn">
            Start Free — 1 Minute Setup
          </Link>
          <div className="hero-trust-row" style={{ marginTop: '1.25rem' }}>
            <span className="trust-item">✓ No credit card</span>
            <span className="trust-item">✓ Free to start</span>
            <span className="trust-item">✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <Link href="/" className="landing-logo">
              <span className="logo-spark-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#6366f1">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </span>
              <span className="logo-text">Review<span className="logo-accent">Spark</span></span>
            </Link>
            <p className="footer-copy">
              AI-powered Google review QR code and reputation system for local businesses.
            </p>
          </div>

          <div className="footer-links-row">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Admin Login</Link>
            <a
              href="https://wa.me/919044875974?text=Hi%2C%20I%20have%20a%20question%20about%20ReviewSpark"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#22c55e', fontWeight: 600 }}
            >
              WhatsApp Support
            </a>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ReviewSpark. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
