'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('expired') === '1';
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">⚡</div>
          <h1 className="login-title">ReviewSpark</h1>
          <p className="login-subtitle">Admin Portal</p>
        </div>

        {isExpired && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            ⚠️ Your session has expired. Please log in again.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !password}
            style={{ width: '100%', marginTop: '0.5rem' }}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--admin-text-faint)',
          }}
        >
          Single-admin access only.
          <br />
          See README for setup instructions.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card"><p>Loading…</p></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
