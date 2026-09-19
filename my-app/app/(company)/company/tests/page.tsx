'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCode2,
  Plus,
  Search,
  Copy,
  Clock,
  ExternalLink,
  Trash2,
  Edit,
  ShieldAlert,
  SlidersHorizontal,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface TestItem {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  durationMinutes: number;
  testLink: string;
  questions: { problemId: number; title: string; points: number }[];
  proctoring: {
    requireCamera: boolean;
    requireMic: boolean;
    preventTabSwitch: boolean;
    requireFullScreen: boolean;
    disableCopyPaste: boolean;
  };
  createdAt: string;
}

export default function CompanyTestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/company/tests');
      const data = await res.json();
      if (data.tests) setTests(data.tests);
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const copyTestLink = (e: React.MouseEvent, link: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = `${window.location.origin}/test/${link}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Test link copied to clipboard!');
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/company/tests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t._id !== id));
        toast.success('Assessment deleted');
      } else {
        toast.error('Failed to delete assessment');
      }
    } catch {
      toast.error('Network error while deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTests = tests.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-widest text-green-400 mb-1">
            Assessments Engine
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Manage Assessments
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure test questions, proctoring security levels, and manage candidate access.
          </p>
        </div>

        <Link
          href="/company/tests/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm shadow-lg shadow-green-500/20 transition active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0c0c0e] border border-white/[0.08] rounded-xl overflow-x-auto">
          {(['all', 'active', 'draft', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition shrink-0 ${
                statusFilter === st
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {st} {st === 'all' ? `(${tests.length})` : `(${tests.filter((t) => t.status === st).length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0c0c0e] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 transition"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
        </div>
      </div>

      {/* Tests Grid / List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 animate-spin text-green-400" />
            <span>Loading assessments...</span>
          </div>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No assessments found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'No assessments match your active search and filter criteria.'
                : 'Get started by creating your first coding challenge assessment.'}
            </p>
          </div>
          {!search && statusFilter === 'all' && (
            <Link
              href="/company/tests/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-xs shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Assessment</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map((test) => {
            const hasProctoring = Object.values(test.proctoring || {}).some(
              (v) => typeof v === 'boolean' && v
            );
            const totalPoints = (test.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);

            return (
              <div
                key={test._id}
                className="group bg-[#0c0c0e] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-6 flex flex-col justify-between gap-5 transition shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
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

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => copyTestLink(e, test.testLink)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                        title="Copy Public Test Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, test._id, test.title)}
                        disabled={deletingId === test._id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-green-400 transition line-clamp-1">
                      {test.title}
                    </h3>
                    {test.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                        {test.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{test.questions?.length || 0} Questions ({totalPoints} pts)</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{test.durationMinutes} mins</span>
                    </span>
                  </div>

                  {hasProctoring && (
                    <div className="flex items-center gap-1.5 text-[11px] text-green-400/80 bg-green-500/5 px-2.5 py-1 rounded-lg border border-green-500/10 w-fit">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Proctoring Security Enabled</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-600">
                    Created {new Date(test.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/company/tests/${test._id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white border border-white/[0.08] transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Configure & Live Monitor</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
