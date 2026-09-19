'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  ChevronDown,
  ChevronUp,
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
  UserCheck,
  Phone,
  GraduationCap,
  Briefcase,
  FileText,
  Github,
  Linkedin,
  FileBadge,
  Code2,
  Mail,
  Send,
  Sparkles,
  UserPlus,
  CheckSquare,
  Square,
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

interface RegistrationFieldConfig {
  enabled: boolean;
  required: boolean;
}

interface RegistrationFormConfig {
  phone: RegistrationFieldConfig;
  rollNumber: RegistrationFieldConfig;
  college: RegistrationFieldConfig;
  graduationYear: RegistrationFieldConfig;
  degree: RegistrationFieldConfig;
  github: RegistrationFieldConfig;
  linkedin: RegistrationFieldConfig;
  resumeUrl: RegistrationFieldConfig;
  experience: RegistrationFieldConfig;
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
  registrationForm: RegistrationFormConfig;
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
  candidate: {
    name: string;
    email: string;
    rollNumber?: string;
    phone?: string;
    college?: string;
    graduationYear?: string;
    degree?: string;
    github?: string;
    linkedin?: string;
    resumeUrl?: string;
    experience?: string;
  };
  status: 'registered' | 'in_progress' | 'submitted' | 'terminated';
  startedAt?: string;
  submittedAt?: string;
  tabSwitchCount: number;
  violations: { type: string; timestamp: string; details?: string }[];
  answers: {
    problemId: number;
    score: number;
    status?: string;
    language?: string;
    code?: string;
    passedTestCases?: number;
    totalTestCases?: number;
  }[];
  totalScore: number;
  maxScore: number;
  feedback?: { rating: number; difficultyRating?: string; comments?: string; submittedAt?: string };
  createdAt: string;
}

interface InvitedCandidateItem {
  email: string;
  name?: string;
  token: string;
  inviteSent: boolean;
  inviteSentAt?: string;
  status?: 'pending' | 'started' | 'completed';
}

const DEFAULT_REGISTRATION_FORM: RegistrationFormConfig = {
  phone: { enabled: true, required: false },
  rollNumber: { enabled: true, required: false },
  college: { enabled: true, required: false },
  graduationYear: { enabled: false, required: false },
  degree: { enabled: false, required: false },
  github: { enabled: false, required: false },
  linkedin: { enabled: false, required: false },
  resumeUrl: { enabled: false, required: false },
  experience: { enabled: false, required: false },
};

function toLocalDatetimeString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  registrationForm: DEFAULT_REGISTRATION_FORM,
  status: 'active',
};

function TestFormContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<TestForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const initialTab =
    searchParams?.get('tab') === 'activity' || searchParams?.get('tab') === 'results'
      ? 'activity'
      : searchParams?.get('tab') === 'invites'
      ? 'invites'
      : 'basic';
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'form' | 'invites' | 'proctoring' | 'settings' | 'activity'>(initialTab);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');

  // Problem Bank Modal & Picker
  const [availableProblems, setAvailableProblems] = useState<ProblemItem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [showProblemPicker, setShowProblemPicker] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [selectedProblemPoints, setSelectedProblemPoints] = useState<Record<number, number>>({});

  // Auto-Pick by Difficulty state
  const [showAutoPickModal, setShowAutoPickModal] = useState(false);
  const [autoPickConfig, setAutoPickConfig] = useState({
    easyCount: 2,
    mediumCount: 2,
    hardCount: 1,
    easyPoints: 10,
    mediumPoints: 20,
    hardPoints: 30,
  });

  // Invited Candidates & Resend Email state
  const [invitedCandidates, setInvitedCandidates] = useState<InvitedCandidateItem[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [bulkCandidateText, setBulkCandidateText] = useState('');
  const [selectedCandidateTokens, setSelectedCandidateTokens] = useState<string[]>([]);
  const [sendingEmails, setSendingEmails] = useState(false);

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
              validFrom: toLocalDatetimeString(t.validFrom),
              validUntil: toLocalDatetimeString(t.validUntil),
              questions: t.questions || [],
              proctoring: t.proctoring || DEFAULT_FORM.proctoring,
              registrationForm: {
                ...DEFAULT_REGISTRATION_FORM,
                ...(t.registrationForm || {}),
              },
              status: t.status || 'active',
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
      const interval = setInterval(loadLiveActivity, 10000);
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

  const updateRegistrationField = (field: keyof RegistrationFormConfig, key: 'enabled' | 'required', val: boolean) => {
    setForm((f) => ({
      ...f,
      registrationForm: {
        ...f.registrationForm,
        [field]: {
          ...f.registrationForm[field],
          [key]: val,
          ...(key === 'required' && val ? { enabled: true } : {}), // If marked required, auto-enable
        },
      },
    }));
  };

  const copyTestLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(`${window.location.origin}/test/${generatedLink}`);
      toast.success('Test link copied to clipboard!');
    }
  };

  // Auto-Pick Questions by Difficulty
  const handleAutoPickQuestions = async () => {
    let pool = availableProblems;
    if (pool.length === 0) {
      setLoadingProblems(true);
      try {
        const res = await fetch('/api/company/problems');
        const data = await res.json();
        pool = data.problems || [];
        setAvailableProblems(pool);
      } catch {
        toast.error('Failed to load problem bank');
        return;
      } finally {
        setLoadingProblems(false);
      }
    }

    const easyPool = pool.filter((p) => p.difficulty === 'easy');
    const mediumPool = pool.filter((p) => p.difficulty === 'medium');
    const hardPool = pool.filter((p) => p.difficulty === 'hard');

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const pickedEasy = shuffle(easyPool)
      .slice(0, Math.max(0, autoPickConfig.easyCount))
      .map((p) => ({
        problemId: p.id,
        title: p.title,
        difficulty: 'easy' as const,
        points: autoPickConfig.easyPoints,
      }));

    const pickedMedium = shuffle(mediumPool)
      .slice(0, Math.max(0, autoPickConfig.mediumCount))
      .map((p) => ({
        problemId: p.id,
        title: p.title,
        difficulty: 'medium' as const,
        points: autoPickConfig.mediumPoints,
      }));

    const pickedHard = shuffle(hardPool)
      .slice(0, Math.max(0, autoPickConfig.hardCount))
      .map((p) => ({
        problemId: p.id,
        title: p.title,
        difficulty: 'hard' as const,
        points: autoPickConfig.hardPoints,
      }));

    const allPicked = [...pickedEasy, ...pickedMedium, ...pickedHard];
    if (allPicked.length === 0) {
      toast.warning('Please specify at least 1 question to pick.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      questions: allPicked,
    }));

    setShowAutoPickModal(false);
    toast.success(`Auto-picked ${allPicked.length} questions (${pickedEasy.length} Easy, ${pickedMedium.length} Medium, ${pickedHard.length} Hard)`);
  };

  // Invited Candidates Handlers
  const loadInvitedCandidates = async () => {
    if (isNew) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(`/api/company/tests/${id}/invite`);
      const data = await res.json();
      if (data.invitedCandidates) {
        setInvitedCandidates(data.invitedCandidates);
      }
    } catch {
      toast.error('Failed to load candidate invites');
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleBulkAddCandidates = async () => {
    if (!bulkCandidateText.trim()) {
      toast.warning('Please enter candidate email addresses.');
      return;
    }

    const lines = bulkCandidateText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      return {
        email: parts[0],
        name: parts[1] || '',
      };
    }).filter((c) => c.email && c.email.includes('@'));

    if (parsed.length === 0) {
      toast.error('No valid email addresses found.');
      return;
    }

    try {
      const res = await fetch(`/api/company/tests/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', candidates: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setInvitedCandidates(data.invitedCandidates || []);
        setBulkCandidateText('');
      } else {
        toast.error(data.error || 'Failed to add candidates');
      }
    } catch {
      toast.error('Error adding candidates');
    }
  };

  const handleDeleteCandidate = async (token: string, email: string) => {
    try {
      const res = await fetch(`/api/company/tests/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', token, email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.info('Candidate removed');
        setInvitedCandidates(data.invitedCandidates || []);
        setSelectedCandidateTokens((prev) => prev.filter((t) => t !== token));
      } else {
        toast.error(data.error || 'Failed to remove candidate');
      }
    } catch {
      toast.error('Error removing candidate');
    }
  };

  const handleSendEmails = async (sendAll = false) => {
    if (!sendAll && selectedCandidateTokens.length === 0) {
      toast.warning('Please select candidates to send invitations to.');
      return;
    }

    setSendingEmails(true);
    try {
      const res = await fetch(`/api/company/tests/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          tokens: selectedCandidateTokens,
          sendAll,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully sent ${data.sentCount} invitation email(s) via Resend!`);
        setInvitedCandidates(data.invitedCandidates || []);
        setSelectedCandidateTokens([]);
      } else {
        toast.error(data.error || 'Failed to send invite emails');
      }
    } catch {
      toast.error('Error dispatching emails');
    } finally {
      setSendingEmails(false);
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

  const registrationFieldsList: {
    key: keyof RegistrationFormConfig;
    label: string;
    description: string;
    icon: any;
  }[] = [
    {
      key: 'phone',
      label: 'Phone Number',
      description: 'Candidate contact or WhatsApp phone number',
      icon: Phone,
    },
    {
      key: 'rollNumber',
      label: 'Roll Number / Student ID',
      description: 'College university roll number or application registration code',
      icon: FileBadge,
    },
    {
      key: 'college',
      label: 'College / Institute Name',
      description: 'Current or graduated university/college name',
      icon: GraduationCap,
    },
    {
      key: 'degree',
      label: 'Degree & Branch',
      description: 'Program of study (e.g. B.Tech Computer Science, MCA)',
      icon: BookOpen,
    },
    {
      key: 'graduationYear',
      label: 'Graduation Year / Batch',
      description: 'Passing out year (e.g. 2025, 2026)',
      icon: Clock,
    },
    {
      key: 'experience',
      label: 'Years of Experience',
      description: 'Total professional or internship experience',
      icon: Briefcase,
    },
    {
      key: 'github',
      label: 'GitHub Profile URL',
      description: 'Link to candidate GitHub account & repositories',
      icon: Github,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn Profile URL',
      description: 'Link to candidate professional LinkedIn profile',
      icon: Linkedin,
    },
    {
      key: 'resumeUrl',
      label: 'Resume / Portfolio Link',
      description: 'Google Drive, PDF, or portfolio URL',
      icon: FileText,
    },
  ];

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
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] transition cursor-pointer"
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
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
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
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'form'
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Candidate Form</span>
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('invites');
              loadInvitedCandidates();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
              activeTab === 'invites'
                ? 'border-green-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Invited Candidates & Emails ({invitedCandidates.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('proctoring')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 shrink-0 cursor-pointer ${
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
                    placeholder="Enter assessment title (e.g. Software Engineering Online Assessment)"
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
                      <option value="active">Active (Open to Candidates)</option>
                      <option value="draft">Draft (Private)</option>
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
                    placeholder="Enter a brief summary of the assessment scope and target role..."
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
                    placeholder="Enter specific guidelines, permitted languages, scoring rules, and instructions for test takers..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition resize-none font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Questions */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Assessment Questions</h2>
                    <p className="text-xs text-zinc-400">
                      {form.questions.length} problems included · Total Score: {totalAssessmentPoints} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAutoPickModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-white/[0.08] transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Auto-Pick by Difficulty</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        loadProblemBank();
                        setShowProblemPicker(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Browse Bank</span>
                    </button>
                  </div>
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
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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

              {/* Problem Bank Browser Modal */}
              {showProblemPicker && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0c0c0e] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
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
                        className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition cursor-pointer"
                      >
                        Done
                      </button>
                    </div>

                    <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setDifficultyFilter(diff)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition shrink-0 cursor-pointer ${
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
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-green-500 hover:text-black text-white text-xs font-bold border border-white/[0.1] transition cursor-pointer"
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

              {/* Auto-Pick Problems by Difficulty Modal */}
              {showAutoPickModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0c0c0e] border border-white/[0.12] rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Auto-Pick Questions</h3>
                          <p className="text-xs text-zinc-400">Specify question counts and points per difficulty</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAutoPickModal(false)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-white transition cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Easy */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-emerald-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-emerald-400">Easy Problems</span>
                          <span className="text-[11px] text-zinc-500 font-mono">Difficulty: Easy</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Number of Questions</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={autoPickConfig.easyCount}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, easyCount: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Points per Question</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={autoPickConfig.easyPoints}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, easyPoints: parseInt(e.target.value) || 10 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Medium */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-amber-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-amber-400">Medium Problems</span>
                          <span className="text-[11px] text-zinc-500 font-mono">Difficulty: Medium</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Number of Questions</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={autoPickConfig.mediumCount}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, mediumCount: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Points per Question</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={autoPickConfig.mediumPoints}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, mediumPoints: parseInt(e.target.value) || 20 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Hard */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-rose-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-rose-400">Hard Problems</span>
                          <span className="text-[11px] text-zinc-500 font-mono">Difficulty: Hard</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Number of Questions</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={autoPickConfig.hardCount}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, hardCount: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Points per Question</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={autoPickConfig.hardPoints}
                              onChange={(e) => setAutoPickConfig({ ...autoPickConfig, hardPoints: parseInt(e.target.value) || 30 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/[0.08] bg-zinc-950 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAutoPickModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoPickQuestions}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition active:scale-[0.98] cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate & Replace Questions</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Candidate Registration Form Config */}
          {activeTab === 'form' && (
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Candidate Registration Form</h2>
                <p className="text-xs text-zinc-400">
                  Select what information candidates must provide before starting this assessment.
                </p>
              </div>

              {/* Mandatory fixed fields banner */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Always Collected (Mandatory)</span>
                  <p className="text-[11px] text-zinc-400">Full Name and Email Address are always required for authentication.</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-green-400 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                  Default Core
                </span>
              </div>

              {/* Configurable dynamic fields checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Additional Candidate Fields
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {registrationFieldsList.map(({ key, label, description, icon: Icon }) => {
                    const fieldConfig = form.registrationForm[key] || { enabled: false, required: false };
                    const isEnabled = fieldConfig.enabled;
                    const isReq = fieldConfig.required;

                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-2xl border transition ${
                          isEnabled
                            ? 'bg-green-500/[0.03] border-green-500/30'
                            : 'bg-zinc-900/40 border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-zinc-900 border border-white/[0.08]">
                              <Icon className={`w-4 h-4 ${isEnabled ? 'text-green-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">{label}</h4>
                              <p className="text-[11px] text-zinc-500">{description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                          {/* Toggle: Ask this field */}
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => updateRegistrationField(key, 'enabled', e.target.checked)}
                              className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                            />
                            <span className="text-zinc-300 text-[11px] font-semibold">Ask in form</span>
                          </label>

                          {/* Toggle: Make required */}
                          {isEnabled && (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isReq}
                                onChange={(e) => updateRegistrationField(key, 'required', e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                              />
                              <span className={`text-[11px] font-bold ${isReq ? 'text-amber-400' : 'text-zinc-500'}`}>
                                Mandatory *
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Candidate Invites & Custom Unique Links */}
          {activeTab === 'invites' && (
            <div className="space-y-6">
              {/* Top Banner & Import Card */}
              <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-green-400" />
                      <span>Candidate Invitations & Unique Links</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Import candidate email lists, generate individual tokenized links, and dispatch invitation emails via Resend.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadInvitedCandidates}
                      disabled={loadingInvites}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                      title="Refresh invited list"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${loadingInvites ? 'animate-spin text-green-400' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Import Textarea */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Add Candidate Emails (One per line or &quot;email, Full Name&quot;)
                  </label>
                  <textarea
                    rows={3}
                    value={bulkCandidateText}
                    onChange={(e) => setBulkCandidateText(e.target.value)}
                    placeholder={`candidate1@gmail.com, John Doe\ncandidate2@outlook.com, Alice Smith\ncandidate3@university.edu`}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-green-500/50 transition resize-none"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-zinc-500">
                      Each candidate will be assigned a cryptographically unique 16-character access token.
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkAddCandidates}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-white/[0.08] transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-green-400" />
                      <span>Add Candidates & Generate Links</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Candidates Table & Bulk Email Dispatcher */}
              <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl overflow-hidden space-y-0">
                {/* Actions Ribbon */}
                <div className="p-4 bg-zinc-900/60 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">
                      {invitedCandidates.length} Total Candidates
                    </span>
                    {selectedCandidateTokens.length > 0 && (
                      <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                        {selectedCandidateTokens.length} Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={invitedCandidates.length === 0}
                      onClick={() => {
                        if (selectedCandidateTokens.length === invitedCandidates.length) {
                          setSelectedCandidateTokens([]);
                        } else {
                          setSelectedCandidateTokens(invitedCandidates.map((c) => c.token));
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer disabled:opacity-50"
                    >
                      {selectedCandidateTokens.length === invitedCandidates.length && invitedCandidates.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>

                    <button
                      type="button"
                      disabled={sendingEmails || selectedCandidateTokens.length === 0}
                      onClick={() => handleSendEmails(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition disabled:opacity-40 cursor-pointer"
                    >
                      {sendingEmails ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send to Selected ({selectedCandidateTokens.length})</span>
                    </button>

                    <button
                      type="button"
                      disabled={sendingEmails || invitedCandidates.length === 0}
                      onClick={() => handleSendEmails(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold border border-white/[0.1] transition disabled:opacity-40 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Send to All ({invitedCandidates.length})</span>
                    </button>
                  </div>
                </div>

                {/* Candidate List / Table */}
                {loadingInvites ? (
                  <div className="py-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                    <span>Loading candidate records...</span>
                  </div>
                ) : invitedCandidates.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Mail className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-400">No candidates added yet</p>
                    <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                      Use the import box above to generate custom invitation links for each candidate.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {invitedCandidates.map((cand) => {
                      const isSelected = selectedCandidateTokens.includes(cand.token);
                      const customUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/test/${generatedLink || id}?token=${cand.token}`;

                      return (
                        <div
                          key={cand.token}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                            isSelected ? 'bg-green-500/[0.03]' : 'hover:bg-white/[0.015]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCandidateTokens((prev) => [...prev, cand.token]);
                                } else {
                                  setSelectedCandidateTokens((prev) => prev.filter((t) => t !== cand.token));
                                }
                              }}
                              className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                            />

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">
                                  {cand.name || cand.email.split('@')[0]}
                                </h4>
                                {cand.name && (
                                  <span className="text-[10px] text-zinc-500 font-mono">({cand.email})</span>
                                )}
                              </div>
                              {!cand.name && (
                                <p className="text-xs text-zinc-400 font-mono">{cand.email}</p>
                              )}
                              
                              {/* Custom Link Badge & Copy */}
                              <div className="pt-1 flex items-center gap-2">
                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-white/[0.06] px-2 py-0.5 rounded truncate max-w-xs sm:max-w-md">
                                  .../test/{generatedLink || id}?token={cand.token}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(customUrl);
                                    toast.success(`Copied unique link for ${cand.email}`);
                                  }}
                                  className="p-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 transition cursor-pointer"
                                  title="Copy custom test link"
                                >
                                  <Copy className="w-3 h-3 text-green-400" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                            {/* Email Status */}
                            <div>
                              {cand.inviteSent ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Email Sent</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-white/[0.06] text-zinc-400 text-[10px] font-bold">
                                  <Clock className="w-3 h-3" />
                                  <span>Not Sent</span>
                                </span>
                              )}
                            </div>

                            {/* Attempt Status */}
                            <div>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  cand.status === 'completed'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : cand.status === 'started'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-zinc-800 text-zinc-500'
                                }`}
                              >
                                {cand.status || 'pending'}
                              </span>
                            </div>

                            {/* Delete Candidate */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand.token, cand.email)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                              title="Delete candidate invite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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

          <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Candidate Attempts & Form Records
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live data auto-refreshes every 10 seconds.
                </p>
              </div>
              <button
                type="button"
                onClick={loadLiveActivity}
                disabled={activityLoading}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition cursor-pointer"
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
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {att.candidate.email}
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

                    {/* Candidate Registration Form Details */}
                    <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-white/[0.04]">
                      {att.candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{att.candidate.phone}</span>
                        </span>
                      )}
                      {att.candidate.rollNumber && (
                        <span className="flex items-center gap-1">
                          <FileBadge className="w-3 h-3 text-zinc-500" />
                          <span>ID: {att.candidate.rollNumber}</span>
                        </span>
                      )}
                      {att.candidate.college && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-zinc-500" />
                          <span>{att.candidate.college}</span>
                        </span>
                      )}
                      {att.candidate.degree && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-zinc-500" />
                          <span>{att.candidate.degree}</span>
                        </span>
                      )}
                      {att.candidate.graduationYear && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>Batch: {att.candidate.graduationYear}</span>
                        </span>
                      )}
                      {att.candidate.experience && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-zinc-500" />
                          <span>Exp: {att.candidate.experience}</span>
                        </span>
                      )}
                      {att.candidate.github && (
                        <a
                          href={att.candidate.github}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-green-400 hover:text-green-300"
                        >
                          <Github className="w-3 h-3" />
                          <span>GitHub</span>
                        </a>
                      )}
                      {att.candidate.linkedin && (
                        <a
                          href={att.candidate.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <Linkedin className="w-3 h-3" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {att.candidate.resumeUrl && (
                        <a
                          href={att.candidate.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Resume</span>
                        </a>
                      )}
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

                    {/* Expandable Action: Inspect Code & Answers */}
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAttemptId(expandedAttemptId === att.id ? null : att.id)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-zinc-300 transition cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-green-400" />
                        <span>
                          {expandedAttemptId === att.id
                            ? 'Hide Submission Details'
                            : `View Submitted Code (${att.answers?.length || 0} Questions)`}
                        </span>
                        {expandedAttemptId === att.id ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-zinc-500" />
                        )}
                      </button>

                      <span className="text-[11px] text-zinc-500">
                        {att.submittedAt
                          ? `Submitted ${new Date(att.submittedAt).toLocaleTimeString()}`
                          : att.startedAt
                          ? `Started ${new Date(att.startedAt).toLocaleTimeString()}`
                          : ''}
                      </span>
                    </div>

                    {/* Detailed Code & Violations Panel */}
                    {expandedAttemptId === att.id && (
                      <div className="mt-3 p-4 rounded-2xl bg-zinc-950 border border-white/[0.06] space-y-4">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Code2 className="w-3.5 h-3.5 text-green-400" />
                          <span>Candidate Code Submissions</span>
                        </h5>

                        {att.answers?.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic">No code submitted for this attempt.</p>
                        ) : (
                          <div className="space-y-4">
                            {att.answers.map((ans, aIdx) => (
                              <div
                                key={aIdx}
                                className="rounded-xl bg-[#0c0c0e] border border-white/[0.06] overflow-hidden"
                              >
                                <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-white/[0.06] flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                      Problem #{ans.problemId}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                      {ans.language}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {ans.passedTestCases !== undefined && ans.totalTestCases !== undefined && (
                                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-white/[0.08] px-2 py-0.5 rounded">
                                        {ans.passedTestCases} / {ans.totalTestCases} Tests Passed
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                        ans.status === 'Accepted'
                                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      }`}
                                    >
                                      {ans.status} ({ans.score} pts)
                                    </span>
                                  </div>
                                </div>
                                <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto bg-[#09090b] max-h-64 leading-relaxed">
                                  {ans.code || '// No code'}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}

                        {att.violations && att.violations.length > 0 && (
                          <div className="pt-2 border-t border-white/[0.06] space-y-2">
                            <h6 className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              <span>Security & Proctoring Incidents</span>
                            </h6>
                            <div className="space-y-1.5">
                              {att.violations.map((v, vIdx) => (
                                <div
                                  key={vIdx}
                                  className="text-xs text-red-300/90 flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10"
                                >
                                  <span className="font-semibold">{v.type.replace('_', ' ').toUpperCase()}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {new Date(v.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

export default function TestFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
        </div>
      }
    >
      <TestFormContent />
    </Suspense>
  );
}
