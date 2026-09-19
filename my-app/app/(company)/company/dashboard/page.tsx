'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCode2,
  Users,
  CheckCircle2,
  Activity,
  Plus,
  ArrowUpRight,
  Copy,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  name: string;
  email: string;
  logo: string;
}

interface TestItem {
  _id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  durationMinutes: number;
  testLink: string;
  questions: { problemId: number; title: string; points: number }[];
  createdAt: string;
}

export default function CompanyDashboard() {
  const [company, setCompany] = useState<Company | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/company/profile').then((response) => response.json()),
      fetch('/api/company/tests').then((response) => response.json()),
    ])
      .then(([companyData, testsData]) => {
        if (companyData.company) setCompany(companyData.company);
        if (testsData.tests) setTests(testsData.tests);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const copyTestLink = (e: React.MouseEvent, link: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = `${window.location.origin}/test/${link}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Test link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-green-400" />
          <span>Loading organization console...</span>
        </div>
      </div>
    );
  }

  const activeTests = tests.filter((test) => test.status === 'active');
  const draftTests = tests.filter((test) => test.status === 'draft');
  const totalQuestions = tests.reduce((total, test) => total + (test.questions?.length || 0), 0);

  const stats = [
    {
      label: 'Total Assessments',
      value: tests.length,
      icon: FileCode2,
      subtext: 'Created in workspace',
      color: 'text-green-400',
    },
    {
      label: 'Live & Active',
      value: activeTests.length,
      icon: ShieldCheck,
      subtext: 'Accessible by candidates',
      color: 'text-emerald-400',
    },
    {
      label: 'Draft Assessments',
      value: draftTests.length,
      icon: Layers,
      subtext: 'Ready for publication',
      color: 'text-amber-400',
    },
    {
      label: 'Question Bank Total',
      value: totalQuestions,
      icon: TrendingUp,
      subtext: 'Curated test challenges',
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Top Header Banner */}
        <header className="flex flex-col justify-between gap-6 border-b border-white/[0.08] pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-green-400">
                Organization Control Room
              </p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              {company?.name || 'Workspace Dashboard'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Create proctored coding assessments, publish unique candidate links, and monitor real-time test progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/company/tests/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-green-400 shadow-lg shadow-green-500/20 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Assessment</span>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, subtext, color }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-6 shadow-sm transition hover:border-white/[0.14]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {label}
                </span>
                <div className="p-2 rounded-lg bg-zinc-900 border border-white/[0.06]">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className="text-3xl font-black tracking-tight text-white mb-1">{value}</p>
              <p className="text-xs text-zinc-500">{subtext}</p>
            </div>
          ))}
        </section>

        {/* Recent Assessments List */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Live & Recent Tests
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-white">Assessment Queue</h2>
            </div>
            <Link
              href="/company/tests"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition"
            >
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {tests.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/[0.08] text-zinc-500">
                <FileCode2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-base">No assessments created yet</h3>
              <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                Create your first coding test, configure proctoring settings, and share the invite link with candidates.
              </p>
              <Link
                href="/company/tests/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-green-400 shadow-md shadow-green-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Test</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {tests.slice(0, 6).map((test) => (
                <div
                  key={test._id}
                  className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/company/tests/${test._id}`}
                    className="flex items-center gap-4 min-w-0 flex-1"
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        test.status === 'active'
                          ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
                          : test.status === 'draft'
                          ? 'bg-amber-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-zinc-100 group-hover:text-white transition truncate">
                          {test.title}
                        </h3>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            test.status === 'active'
                              ? 'border-green-400/20 bg-green-400/10 text-green-300'
                              : test.status === 'draft'
                              ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                              : 'border-white/[0.08] text-zinc-500'
                          }`}
                        >
                          {test.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <FileCode2 className="w-3.5 h-3.5" />
                          <span>{test.questions?.length || 0} Questions</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{test.durationMinutes} Mins</span>
                        </span>
                        <span>·</span>
                        <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {test.testLink && (
                      <button
                        onClick={(e) => copyTestLink(e, test.testLink)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] transition"
                        title="Copy Candidate Test Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    )}

                    <Link
                      href={`/company/tests/${test._id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-400 hover:bg-green-500/10 border border-green-500/20 transition"
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
