'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ClipboardList, Clock3, FilePenLine, Plus, ShieldCheck } from 'lucide-react';

interface Company { name: string; email: string; logo: string; }
interface TestItem { _id: string; title: string; status: 'draft' | 'active' | 'archived'; durationMinutes: number; questions: unknown[]; createdAt: string; }

export default function CompanyDashboard() {
  const [company, setCompany] = useState<Company | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/company/profile').then((response) => response.json()),
      fetch('/api/company/tests').then((response) => response.json()),
    ]).then(([companyData, testsData]) => {
      if (companyData.company) setCompany(companyData.company);
      if (testsData.tests) setTests(testsData.tests);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-sm text-zinc-500">Loading company workspace...</div>;

  const activeTests = tests.filter((test) => test.status === 'active');
  const draftTests = tests.filter((test) => test.status === 'draft');
  const stats = [
    { label: 'Total tests', value: tests.length, icon: ClipboardList },
    { label: 'Live links', value: activeTests.length, icon: ShieldCheck },
    { label: 'Drafts', value: draftTests.length, icon: FilePenLine },
    { label: 'Questions', value: tests.reduce((total, test) => total + test.questions.length, 0), icon: Clock3 },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-6 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-green-400">Company control room</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{company?.name || 'Your workspace'}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Create focused assessments, publish secure links, and keep every candidate experience under control.</p>
          </div>
          <Link href="/company/tests/new" className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm font-bold text-green-300 transition hover:border-green-300/60 hover:bg-green-400/15"><Plus className="h-4 w-4" /> New assessment</Link>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => <div key={label} className="bg-[#0c0c0e] p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{label}</span><Icon className="h-4 w-4 text-zinc-600" /></div><p className="text-3xl font-black tracking-tight text-zinc-100">{value}</p></div>)}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c0e]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Assessment queue</p><h2 className="mt-1 text-lg font-bold">Recent tests</h2></div><Link href="/company/tests" className="inline-flex items-center gap-1 text-xs font-bold text-green-400 hover:text-green-300">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          {tests.length === 0 ? <div className="px-6 py-20 text-center"><ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-700" /><h3 className="font-bold">No assessments yet</h3><p className="mt-2 text-sm text-zinc-500">Your first test link starts here.</p><Link href="/company/tests/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-green-400"><Plus className="h-4 w-4" /> Create test</Link></div> : <div className="divide-y divide-white/[0.06]">{tests.slice(0, 6).map((test) => <Link href={`/company/tests/${test._id}`} key={test._id} className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><div className={`h-2 w-2 rounded-full ${test.status === 'active' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,.7)]' : test.status === 'draft' ? 'bg-amber-400' : 'bg-zinc-700'}`} /><div><h3 className="font-bold text-zinc-200 group-hover:text-white">{test.title}</h3><p className="mt-1 text-xs text-zinc-600">{test.questions.length} questions <span className="px-1">·</span> {test.durationMinutes} minutes <span className="px-1">·</span> {new Date(test.createdAt).toLocaleDateString()}</p></div></div><span className={`w-fit rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${test.status === 'active' ? 'border-green-400/20 bg-green-400/10 text-green-300' : test.status === 'draft' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : 'border-white/[0.08] text-zinc-500'}`}>{test.status}</span></Link>)}</div>}
        </section>
      </div>
    </div>
  );
}
