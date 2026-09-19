'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileCode2,
  ListChecks,
  ShieldCheck,
  Settings,
  Activity,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  Save,
  Check,
  AlertCircle,
  Clock,
  Camera,
  Mic,
  Maximize2,
  EyeOff,
  ClipboardX,
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  Star,
  Users,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface TestQuestion {
  problemId: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface ProctoringConfig {
  requireCamera: boolean;
  requireMic: boolean;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
  requireFullScreen: boolean;
  disableCopyPaste: boolean;
}

interface TestForm {
  title: string;
  description: string;
  instructions: string;
  durationMinutes: number;
  validFrom: string;
  validUntil: string;
  questions: TestQuestion[];
  proctoring: ProctoringConfig;
  status: 'draft' | 'active' | 'archived';
}

interface ProblemItem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
}

interface CandidateAttempt {
  id: string;
  candidate: { name: string; email: string; rollNumber?: string; phone?: string };
  status: 'registered' | 'in_progress' | 'submitted' | 'terminated';
  startedAt?: string;
  submittedAt?: string;
  tabSwitchCount: number;
  violations: { type: string; timestamp: string; details?: string }[];
  answers: { problemId: number; score: number; status?: string; language?: string }[];
  totalScore: number;
  maxScore: number;
  feedback?: { rating: number; difficultyRating?: string; comments?: string; submittedAt?: string };
  createdAt: string;
}

const DEFAULT_FORM: TestForm = {
  title: '',
  description: '',
  instructions: '',
  durationMinutes: 60,
  validFrom: '',
  validUntil: '',
  questions: [],
  proctoring: {
    requireCamera: false,
    requireMic: false,
    preventTabSwitch: false,
    maxTabSwitches: 3,
    requireFullScreen: false,
    disableCopyPaste: false,
  },
  status: 'draft',
};

export default function TestFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<TestForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'proctoring' | 'settings' | 'activity'>('basic');
  const [generatedLink, setGeneratedLink] = useState('');

  // Problem Bank Modal & Picker
  const [availableProblems, setAvailableProblems] = useState<ProblemItem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [showProblemPicker, setShowProblemPicker] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [selectedProblemPoints, setSelectedProblemPoints] = useState<Record<number, number>>({});

  // Live Activity state
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityData, setActivityData] = useState<{
    stats: {
      totalCandidates: number;
      inProgress: number;
      submitted: number;
      terminated: number;
      averageScore: number;
      violationsCount: number;
    };
    attempts: CandidateAttempt[];
  } | null>(null);

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/company/tests/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.test) {
            const t = data.test;
            setForm({
              title: t.title || '',
              description: t.description || '',
              instructions: t.instructions || '',
              durationMinutes: t.durationMinutes || 60,
              validFrom: t.validFrom ? new Date(t.validFrom).toISOString().slice(0, 16) : '',
              validUntil: t.validUntil ? new Date(t.validUntil).toISOString().slice(0, 16) : '',
              questions: t.questions || [],
              proctoring: t.proctoring || DEFAULT_FORM.proctoring,
              status: t.status || 'draft',
            });
            setGeneratedLink(t.testLink);
          }
          setLoading(false);
        })
        .catch(() => {
          toast.error('Failed to load test details');
          setLoading(false);
        });
    }
  }, [id, isNew]);

  // Load problem bank
  const loadProblemBank = async () => {
    if (availableProblems.length > 0) return;
    setLoadingProblems(true);
    try {
      const res = await fetch('/api/company/problems');
      const data = await res.json();
      if (data.problems) {
        setAvailableProblems(data.problems);
      }
    } catch {
      toast.error('Failed to load problem bank');
    } finally {
      setLoadingProblems(false);
    }
  };

  // Load live activity
  const loadLiveActivity = async () => {
    if (isNew) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/company/tests/${id}/activity`);
      const data = await res.json();
      if (data.stats) {
        setActivityData({ stats: data.stats, attempts: data.attempts });
      }
    } catch {
      toast.error('Failed to load live activity');
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activity' && !isNew) {
      loadLiveActivity();
      const interval = setInterval(loadLiveActivity, 10000); // auto-refresh every 10s
      return () => clearInterval(interval);
    }
  }, [activeTab, id, isNew]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
    };

    try {
      const res = isNew
        ? await fetch('/api/company/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/company/tests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save test');
      } else {
        toast.success(isNew ? 'Assessment created successfully!' : 'Assessment updated successfully!');
        if (isNew && data.test?._id) {
          router.push(`/company/tests/${data.test._id}`);
        }
        setGeneratedLink(data.test?.testLink || generatedLink);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addProblemFromBank = (prob: ProblemItem) => {
    if (form.questions.some((q) => q.problemId === prob.id)) {
      toast.info('Problem is already added to this assessment');
      return;
    }
    const points = selectedProblemPoints[prob.id] || (prob.difficulty === 'easy' ? 10 : prob.difficulty === 'medium' ? 20 : 30);
    setForm((f) => ({
      ...f,
      questions: [
        ...f.questions,
        {
          problemId: prob.id,
          title: prob.title,
          difficulty: prob.difficulty,
          points,
        },
      ],
    }));
    toast.success(`Added "${prob.title}" to assessment`);
  };

  const removeQuestion = (index: number) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
    toast.info('Question removed');
  };

  const updateQuestionPoints = (index: number, points: number) => {
    setForm((f) => {
      const updated = [...f.questions];
      updated[index].points = points;
      return { ...f, questions: updated };
    });
  };

  const updateProctoring = (key: keyof ProctoringConfig, value: boolean | number) => {
    setForm((f) => ({ ...f, proctoring: { ...f.proctoring, [key]: value } }));
  };

  const copyTestLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(`${window.location.origin}/test/${generatedLink}`);
      toast.success('Test link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-green-400" />
          <span>Loading assessment configuration...</span>
        </div>
      </div>
    );
  }

  const filteredBankProblems = availableProblems.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(problemSearch.toLowerCase()));
    const matchDiff = difficultyFilter === 'all' || p.difficulty === difficultyFilter;
    return matchSearch && matchDiff;
  });

  const totalAssessmentPoints = form.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <Link
            href="/company/tests"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Assessments</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isNew ? 'New Assessment' : form.title || 'Edit Assessment'}
            </h1>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                form.status === 'active'
                  ? 'border-green-400/20 bg-green-400/10 text-green-300'
                  : form.status === 'draft'
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-white/[0.08] text-zinc-500'
              }`}
            >
              {form.status}
            </span>
          </div>
        </div>

        {!isNew && generatedLink && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTestLink}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] transition"
            >
              <Copy className="w-3.5 h-3.5 text-green-400" />
              <span>Copy Public Link</span>
            </button>
            <Link
              href={`/test/${generatedLink}`}
              target="_blank"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition"
              title="Preview Landing Page"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 ${
            activeTab === 'basic'
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Basic Info</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('questions');
            loadProblemBank();
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 ${
            activeTab === 'questions'
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Questions ({form.questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proctoring')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 ${
            activeTab === 'proctoring'
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Proctoring</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 ${
            activeTab === 'settings'
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 ${
              activeTab === 'activity'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Activity & Candidates</span>
          </button>
        )}
      </div>

      {/* TAB CONTENT */}
      {activeTab !== 'activity' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB: Basic Info */}
          {activeTab === 'basic' && (
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Assessment Details</h2>
                <p className="text-xs text-zinc-400">Basic metadata shown to candidate before the test begins.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Assessment Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer Coding Round"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Duration (Minutes) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        max={300}
                        required
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })}
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-green-500/50 transition"
                      />
                      <Clock className="absolute right-3.5 top-3 w-4 h-4 text-zinc-600" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-green-500/50 transition"
                    >
                      <option value="draft">Draft (Private)</option>
                      <option value="active">Active (Open to Candidates)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the assessment scope..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Candidate Instructions
                  </label>
                  <textarea
                    rows={5}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    placeholder="Provide specific guidelines, permitted languages, and rules for test takers..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition resize-none font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Questions */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {/* Added Questions List */}
              <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Assessment Questions</h2>
                    <p className="text-xs text-zinc-400">
                      {form.questions.length} problems included · Total Score: {totalAssessmentPoints} pts
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      loadProblemBank();
                      setShowProblemPicker(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Browse Question Bank</span>
                  </button>
                </div>

                {form.questions.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-400 font-semibold">No questions added yet</p>
                    <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                      Click the button above to pick algorithmic problems from the CodeArena problem repository.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {form.questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-400">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{q.title}</h4>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  q.difficulty === 'easy'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : q.difficulty === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Problem ID #{q.problemId}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Points:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.points}
                              onChange={(e) => updateQuestionPoints(idx, parseInt(e.target.value) || 10)}
                              className="w-16 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-white text-center focus:outline-none focus:border-green-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeQuestion(idx)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Remove question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Problem Bank Browser / Picker Modal */}
              {showProblemPicker && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0c0c0e] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                    {/* Modal Header */}
                    <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Select Problems from Bank</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Browse verified coding challenges to add to your assessment.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProblemPicker(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition"
                      >
                        Done
                      </button>
                    </div>

                    {/* Filter bar */}
                    <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setDifficultyFilter(diff)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition shrink-0 ${
                              difficultyFilter === diff
                                ? 'bg-white/[0.12] text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>

                      <div className="relative flex-1 max-w-xs">
                        <input
                          type="text"
                          value={problemSearch}
                          onChange={(e) => setProblemSearch(e.target.value)}
                          placeholder="Search problems by name or tag..."
                          className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50"
                        />
                        <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </div>

                    {/* Problems List */}
                    <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/[0.06]">
                      {loadingProblems ? (
                        <div className="py-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                          <span>Loading problems repository...</span>
                        </div>
                      ) : filteredBankProblems.length === 0 ? (
                        <div className="py-16 text-center text-zinc-500 text-xs">
                          No problems found matching your criteria.
                        </div>
                      ) : (
                        filteredBankProblems.map((prob) => {
                          const isAlreadyAdded = form.questions.some((q) => q.problemId === prob.id);
                          return (
                            <div
                              key={prob.id}
                              className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                            >
                              <div className="space-y-1.5 max-w-xl">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-zinc-500">#{prob.id}</span>
                                  <h4 className="text-sm font-bold text-white">{prob.title}</h4>
                                  <span
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      prob.difficulty === 'easy'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : prob.difficulty === 'medium'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}
                                  >
                                    {prob.difficulty}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                  {prob.description}
                                </p>
                                {prob.tags && prob.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {prob.tags.map((t) => (
                                      <span
                                        key={t}
                                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-400"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {isAlreadyAdded ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addProblemFromBank(prob)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-green-500 hover:text-black text-white text-xs font-bold border border-white/[0.1] transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Problem</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Proctoring Settings */}
          {activeTab === 'proctoring' && (
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Anti-Cheat & Proctoring Security</h2>
                <p className="text-xs text-zinc-400">
                  Enforce strict browser and hardware checks to maintain exam integrity.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera */}
                <div
                  className={`p-5 rounded-2xl border transition ${
                    form.proctoring.requireCamera
                      ? 'bg-green-500/[0.04] border-green-500/30'
                      : 'bg-zinc-900/50 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-bold text-white">Webcam Verification</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Candidates must grant camera permission and keep their camera active during the test.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctoring.requireCamera}
                      onChange={(e) => updateProctoring('requireCamera', e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Microphone */}
                <div
                  className={`p-5 rounded-2xl border transition ${
                    form.proctoring.requireMic
                      ? 'bg-green-500/[0.04] border-green-500/30'
                      : 'bg-zinc-900/50 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-bold text-white">Microphone Monitoring</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Enables continuous audio presence check throughout the candidate session.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctoring.requireMic}
                      onChange={(e) => updateProctoring('requireMic', e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Fullscreen */}
                <div
                  className={`p-5 rounded-2xl border transition ${
                    form.proctoring.requireFullScreen
                      ? 'bg-green-500/[0.04] border-green-500/30'
                      : 'bg-zinc-900/50 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-bold text-white">Full Screen Enforcement</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Candidates must take test in full screen. Exiting full screen triggers violation flags.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctoring.requireFullScreen}
                      onChange={(e) => updateProctoring('requireFullScreen', e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Copy Paste Block */}
                <div
                  className={`p-5 rounded-2xl border transition ${
                    form.proctoring.disableCopyPaste
                      ? 'bg-green-500/[0.04] border-green-500/30'
                      : 'bg-zinc-900/50 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ClipboardX className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-bold text-white">Block External Copy-Paste</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Prevents pasting code from external sources into the editor environment.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctoring.disableCopyPaste}
                      onChange={(e) => updateProctoring('disableCopyPaste', e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tab Switch Detection */}
                <div
                  className={`p-5 rounded-2xl border transition md:col-span-2 ${
                    form.proctoring.preventTabSwitch
                      ? 'bg-green-500/[0.04] border-green-500/30'
                      : 'bg-zinc-900/50 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-bold text-white">Tab Switch Detection & Auto-Termination</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Monitors browser focus. When a candidate leaves the test tab, a violation is logged.
                      </p>

                      {form.proctoring.preventTabSwitch && (
                        <div className="pt-2 flex items-center gap-3">
                          <span className="text-xs text-zinc-300 font-semibold">
                            Max allowed tab switches before auto-termination:
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={form.proctoring.maxTabSwitches}
                            onChange={(e) =>
                              updateProctoring('maxTabSwitches', parseInt(e.target.value) || 3)
                            }
                            className="w-16 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.1] text-xs text-white text-center focus:outline-none focus:border-green-500"
                          />
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctoring.preventTabSwitch}
                      onChange={(e) => updateProctoring('preventTabSwitch', e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Access Window & Schedule</h2>
                <p className="text-xs text-zinc-400">Configure when candidates are allowed to access this assessment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Valid From (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Valid Until / Expiration (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Link
              href="/company/tests"
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20 transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Assessment...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isNew ? 'Create Assessment' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* TAB: Live Activity & Candidates */
        <div className="space-y-6">
          {/* Real-time stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  Total Candidates
                </span>
                <Users className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-black text-white">
                {activityData?.stats.totalCandidates || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">
                  In Progress
                </span>
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              </div>
              <p className="text-2xl font-black text-green-400">
                {activityData?.stats.inProgress || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                  Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">
                {activityData?.stats.submitted || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">
                  Violations / Terminated
                </span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-black text-red-400">
                {activityData?.stats.violationsCount || 0} / {activityData?.stats.terminated || 0}
              </p>
            </div>
          </div>

          {/* Candidate attempts table */}
          <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Candidate Attempts
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Auto-refreshes every 10 seconds.
                </p>
              </div>
              <button
                type="button"
                onClick={loadLiveActivity}
                disabled={activityLoading}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition"
                title="Refresh Live Data"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin text-green-400' : ''}`} />
              </button>
            </div>

            {activityData?.attempts.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No candidates have registered for this assessment yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {activityData?.attempts.map((att) => (
                  <div key={att.id} className="p-5 space-y-3 hover:bg-white/[0.015] transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{att.candidate.name}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              att.status === 'in_progress'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : att.status === 'submitted'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : att.status === 'terminated'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {att.candidate.email} {att.candidate.rollNumber ? `· ID: ${att.candidate.rollNumber}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-zinc-500 block text-[10px] uppercase font-bold">Score</span>
                          <span className="text-sm font-black text-white">
                            {att.totalScore} / {att.maxScore}
                          </span>
                        </div>

                        {att.violations.length > 0 && (
                          <div className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold">
                            {att.violations.length} Violations
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Candidate feedback pill */}
                    {att.feedback && (
                      <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < (att.feedback?.rating || 0)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          {att.feedback.difficultyRating && (
                            <span className="text-[10px] uppercase font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">
                              {att.feedback.difficultyRating}
                            </span>
                          )}
                          {att.feedback.comments && (
                            <span className="text-zinc-300 italic">"{att.feedback.comments}"</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
