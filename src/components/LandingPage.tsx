'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
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
      q: 'How do I get my ready-to-print QR stand?',
      a: 'Simply contact us at parnavagarwal1@gmail.com with your business details and Google Maps listing. We will set up everything for you and send you your ready-to-print QR code stand in high resolution.',
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
            <a href="#contact" className="nav-link">Contact Us</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>

          <div className="header-actions">
            <Link href="/login" className="btn-nav-login">
              Login
            </Link>
            <a href="#contact" className="btn-nav-primary">
              Get Your QR
            </a>
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
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Link href="/login" className="btn-nav-login" style={{ flex: 1, textAlign: 'center' }}>
                Login
              </Link>
              <a href="#contact" className="btn-nav-primary" style={{ flex: 1, textAlign: 'center' }}>
                Get Your QR
              </a>
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
              <a href="#contact" className="btn-hero-primary">
                Get Your QR Stand
              </a>
              <a
                href="mailto:parnavagarwal1@gmail.com?subject=Inquiry%20about%20ReviewSpark%20QR%20Stand"
                className="btn-hero-secondary"
              >
                <span>✉️</span> Contact Us
              </a>
            </div>

            <div className="hero-trust-row">
              <span className="trust-item">✓ Easy setup</span>
              <span className="trust-item">✓ Dedicated support</span>
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

      {/* ── Contact Us Section ─────────────────────────────────────────── */}
      <section id="contact" className="contact-section">
        <div className="landing-container">
          <div className="contact-card-wrapper">
            <div className="contact-card-glow"></div>
            <div className="contact-card-inner">
              <span className="section-kicker" style={{ textAlign: 'center' }}>Get In Touch</span>
              <h2 className="contact-card-title">
                To get your QR stand or have any query, <span className="gradient-text">Contact Us</span>
              </h2>
              <p className="contact-card-desc">
                Have questions, want a customized QR code stand for your shop or clinic, or need help setting up your Google Business Profile? Drop us an email anytime and we will get back to you promptly!
              </p>

              <div className="contact-email-box">
                <span className="contact-email-label">DIRECT EMAIL CONTACT</span>
                <a href="mailto:parnavagarwal1@gmail.com?subject=ReviewSpark%20QR%20Stand%20Inquiry" className="contact-email-link">
                  <span className="contact-email-icon">✉️</span>
                  <span>parnavagarwal1@gmail.com</span>
                </a>
              </div>

              <div className="contact-benefits-row">
                <div className="contact-benefit-item">
                  <span>🚀</span>
                  <span>Instant Setup Support</span>
                </div>
                <div className="contact-benefit-item">
                  <span>🖨️</span>
                  <span>High-Resolution QR Stand PDF</span>
                </div>
                <div className="contact-benefit-item">
                  <span>🤝</span>
                  <span>Customized for Your Business</span>
                </div>
              </div>
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
          <a
            href="mailto:parnavagarwal1@gmail.com?subject=Get%20Started%20with%20ReviewSpark%20QR"
            className="btn-hero-primary bottom-cta-btn"
          >
            Contact to Get Your QR Stand
          </a>
          <div className="hero-trust-row" style={{ marginTop: '1.25rem' }}>
            <span className="trust-item">✓ Fast response</span>
            <span className="trust-item">✓ Free consultation</span>
            <span className="trust-item">✓ 100% Google Compliant</span>
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
            <a href="#contact">Contact Us</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Admin Login</Link>
            <a
              href="mailto:parnavagarwal1@gmail.com"
              style={{ color: '#818cf8', fontWeight: 600 }}
            >
              ✉️ parnavagarwal1@gmail.com
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
