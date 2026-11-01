import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <nav className="admin-nav" role="navigation" aria-label="Admin navigation">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/dashboard" className="admin-nav-brand">
            <span className="admin-nav-spark-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </span>
            <span>Review<span className="admin-nav-brand-spark">Spark</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '999px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <span className="adm-pill-dot" style={{ width: '6px', height: '6px' }} />
            <span>Telemetry Online</span>
          </div>
        </div>

        <div className="admin-nav-links">
          <Link href="/dashboard" className="admin-nav-link" id="nav-dashboard">
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/businesses" className="admin-nav-link" id="nav-businesses">
            <span>🏢</span>
            <span>Businesses</span>
          </Link>
          <Link href="/analytics" className="admin-nav-link" id="nav-analytics">
            <span>📈</span>
            <span>Analytics</span>
          </Link>
          <Link href="/" target="_blank" className="admin-nav-public-btn" title="Open public landing page in new tab">
            <span>Public Site</span>
            <span>↗</span>
          </Link>
          <LogoutButton />
        </div>
      </nav>

      <main className="admin-main" role="main">
        {children}
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST" style={{ display: 'inline' }}>
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        id="nav-logout-btn"
        formAction="/api/auth/logout"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '0.35rem 0.75rem',
          color: '#94a3b8',
        }}
      >
        Sign out
      </button>
    </form>
  );
}
