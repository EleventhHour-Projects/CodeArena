'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileCode2,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

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
    icon: LayoutDashboard,
  },
  {
    href: '/company/tests',
    label: 'Assessments',
    icon: FileCode2,
  },
  {
    href: '/company/profile',
    label: 'Company Profile',
    icon: Building2,
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
    <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100 flex flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#0c0c0e] border-r border-white/[0.08] transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Subtle glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Header / Brand */}
        <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/[0.08]">
          <Link href="/company/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-zinc-900 border border-white/[0.1] shrink-0 transition group-hover:border-green-500/40">
              <Logo width={22} height={17} />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">CodeArena</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    Org
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                  Assessment Portal
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Company Quick Profile Pill */}
        {sidebarOpen && company && (
          <div className="relative z-10 mx-3 mt-3 p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 border border-white/[0.1] flex items-center justify-center shrink-0">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-green-400">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate">{company.name}</span>
              <span className="text-[11px] text-zinc-500 truncate">{company.email}</span>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="relative z-10 flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                  active
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                } ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-green-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="relative z-10 p-3 border-t border-white/[0.08] space-y-2">
          {sidebarOpen && (
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition"
            >
              <span>Main Arena</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition ${
              !sidebarOpen ? 'justify-center px-0' : ''
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>{loggingOut ? 'Logging out...' : 'Sign out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
