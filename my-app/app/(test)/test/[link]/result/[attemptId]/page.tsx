'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  Clock,
  ShieldCheck,
  Star,
  ArrowRight,
  ExternalLink,
  Award,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface ResultData {
  attempt: {
    id: string;
    candidate: { name: string; email: string; rollNumber?: string };
    status: 'registered' | 'in_progress' | 'submitted' | 'terminated';
    startedAt?: string;
    submittedAt?: string;
    tabSwitchCount: number;
    violations: { type: string; timestamp: string; details?: string }[];
    answers: { problemId: number; score: number; status?: string }[];
    totalScore: number;
    maxScore: number;
    feedback?: { rating: number; difficultyRating?: string; comments?: string };
  };
  test: {
    title: string;
    durationMinutes: number;
    questions: { problemId: number; title: string; points: number }[];
  };
  company?: {
    name: string;
    logo: string;
    website?: string;
  };
}

export default function TestResultPage() {
  const params = useParams();
  const router = useRouter();
  const link = params?.link as string;
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResultData | null>(null);

  useEffect(() => {
    if (!attemptId) return;

    fetch(`/api/test/attempt/${attemptId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.attempt && res.test) {
          setData(res);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          <span className="text-sm text-zinc-400">Loading your assessment results...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white p-6">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Results Not Available</h2>
          <p className="text-xs text-zinc-500">Could not retrieve attempt records.</p>
        </div>
      </div>
    );
  }

  const { attempt, test, company } = data;
  const isTerminated = attempt.status === 'terminated';
  const solvedCount = attempt.answers.filter((a) => a.status === 'Accepted').length;
  const percent = attempt.maxScore > 0 ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col items-center justify-center p-6 sm:p-10 relative">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(34,197,94,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-xl bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 sm:p-10 space-y-8 relative z-10 shadow-2xl">
        {/* Company Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3.5">
            {company?.logo ? (
              <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.1] flex items-center justify-center font-black text-green-400 text-sm">
                {company?.name ? company.name.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-white">{company?.name || 'CodeArena Assessment'}</h3>
              <p className="text-xs text-zinc-500">{test.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Logo width={22} height={17} />
          </div>
        </div>

        {/* Completion Icon & Title */}
        <div className="text-center space-y-2">
          <div
            className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4 ${
              isTerminated
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-lg shadow-red-500/10'
                : 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-lg shadow-green-500/10'
            }`}
          >
            {isTerminated ? <AlertTriangle className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isTerminated ? 'Assessment Terminated' : 'Assessment Completed!'}
          </h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {isTerminated
              ? 'Your test was flagged and stopped due to exceeding allowable proctoring violations.'
              : 'Thank you for completing the test. Your submissions and answers have been recorded.'}
          </p>
        </div>

        {/* Score Card */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Total Score</span>
            <span className="text-xl font-black text-white">
              {attempt.totalScore} <span className="text-xs text-zinc-500 font-normal">/ {attempt.maxScore}</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Solved</span>
            <span className="text-xl font-black text-green-400">
              {solvedCount} <span className="text-xs text-zinc-500 font-normal">/ {test.questions.length}</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Performance</span>
            <span className="text-xl font-black text-white">{percent}%</span>
          </div>
        </div>

        {/* Candidate & Proctoring Details */}
        <div className="space-y-3 text-xs text-zinc-400 border-t border-white/[0.06] pt-6">
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Candidate Name</span>
            <span className="font-semibold text-white">{attempt.candidate.name}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Email</span>
            <span className="text-zinc-300">{attempt.candidate.email}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Proctoring Flags</span>
            <span className={attempt.violations.length > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-semibold'}>
              {attempt.violations.length === 0 ? 'No Violations Flagged' : `${attempt.violations.length} Violations Logged`}
            </span>
          </div>

          {attempt.feedback && (
            <div className="flex justify-between py-1 items-center">
              <span className="text-zinc-500">Your Rating</span>
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < attempt.feedback!.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/[0.1] transition"
          >
            <span>Return to CodeArena Homepage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
