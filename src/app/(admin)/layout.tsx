import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <nav className="admin-nav" role="navigation" aria-label="Admin navigation">
        <Link href="/dashboard" className="admin-nav-brand">
          <span aria-hidden="true">⚡</span>
          ReviewSpark
        </Link>

        <div className="admin-nav-links">
          <Link href="/dashboard" className="admin-nav-link" id="nav-dashboard">
            Dashboard
          </Link>
          <Link href="/businesses" className="admin-nav-link" id="nav-businesses">
            Businesses
          </Link>
          <Link href="/analytics" className="admin-nav-link" id="nav-analytics">
            Analytics
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
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        id="nav-logout-btn"
        formAction="/api/auth/logout"
      >
        Sign out
      </button>
    </form>
  );
}
