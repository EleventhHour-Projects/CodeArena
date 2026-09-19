'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  email: string;
  logo: string;
}

const NAV_ITEMS = [
  {
    href: '/company/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/company/tests',
    label: 'Tests',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: '/company/profile',
    label: 'Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [company, setCompany] = useState<Company | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (pathname === '/company/login') return;
    fetch('/api/company/profile')
      .then((r) => {
        if (r.status === 401) {
          router.replace('/company/login');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.company) setCompany(d.company);
      })
      .catch(() => {});
  }, [pathname, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/company/logout', { method: 'POST' });
    router.push('/company/login');
  };

  if (pathname === '/company/login') return <>{children}</>;

  return (
    <div className="company-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#brandGrad)" />
                <path d="M8 14L13 19L20 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#22c55e" /><stop offset="1" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {sidebarOpen && <span className="brand-name">CodeArena</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {sidebarOpen ? (
                <path d="M15 6l-6 6 6 6" />
              ) : (
                <path d="M9 6l6 6-6 6" />
              )}
            </svg>
          </button>
        </div>

        {sidebarOpen && company && (
          <div className="company-info">
            <div className="company-avatar">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="avatar-img" />
              ) : (
                <span className="avatar-initials">{company.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="company-meta">
              <span className="company-name-label">{company.name}</span>
              <span className="company-email-label">{company.email}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
                {active && <span className="nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`logout-btn ${!sidebarOpen ? 'icon-only' : ''}`}
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {sidebarOpen && <span>{loggingOut ? 'Logging out…' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
        {children}
      </main>

      <style jsx>{`
        .company-layout {
          display: flex;
          min-height: 100vh;
          background: #07070d;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #e8e8f0;
        }

        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: rgba(255, 255, 255, 0.03);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          flex-shrink: 0;
        }

        .sidebar.collapsed {
          width: 68px;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .brand-icon { flex-shrink: 0; }

        .brand-name {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          background: #22c55e;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-toggle {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .sidebar-toggle:hover {
          background: rgba(108, 99, 255, 0.2);
          color: #6ee7b7;
        }

        .company-info {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(108, 99, 255, 0.05);
        }

        .company-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          overflow: hidden;
          background: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-initials {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .company-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .company-name-label {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .company-email-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          transition: all 0.18s;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.85);
        }

        .nav-item.active {
          background: rgba(108, 99, 255, 0.15);
          color: #a09cff;
        }

        .nav-icon { flex-shrink: 0; }
        .nav-label { font-size: 14px; font-weight: 500; }

        .nav-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: linear-gradient(to bottom, #22c55e, #6ee7b7);
          border-radius: 0 3px 3px 0;
        }

        .sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: rgba(255, 100, 100, 0.7);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.18s;
        }

        .logout-btn:hover:not(:disabled) {
          background: rgba(255, 77, 79, 0.1);
          color: #ff7875;
        }

        .logout-btn.icon-only {
          justify-content: center;
          padding: 10px;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
