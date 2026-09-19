'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  FileCode2,
  ShieldCheck,
  Camera,
  Mic,
  Maximize2,
  EyeOff,
  ClipboardX,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Loader2,
  Hourglass,
  Check,
  Phone,
  GraduationCap,
  Briefcase,
  FileText,
  Github,
  Linkedin,
  FileBadge,
  BookOpen,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

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
  phone?: RegistrationFieldConfig;
  rollNumber?: RegistrationFieldConfig;
  college?: RegistrationFieldConfig;
  graduationYear?: RegistrationFieldConfig;
  degree?: RegistrationFieldConfig;
  github?: RegistrationFieldConfig;
  linkedin?: RegistrationFieldConfig;
  resumeUrl?: RegistrationFieldConfig;
  experience?: RegistrationFieldConfig;
}

interface TestInfo {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  questionCount: number;
  proctoring: ProctoringConfig;
  registrationForm?: RegistrationFormConfig;
  validFrom?: string;
  validUntil?: string;
  status: string;
}

interface CompanyInfo {
  name: string;
  logo: string;
  website?: string;
  description?: string;
  email?: string;
}

type Stage = 'loading' | 'upcoming' | 'ended' | 'info' | 'register' | 'precheck' | 'error';

export default function TestLandingPage() {
  const params = useParams();
  const router = useRouter();
  const link = params?.link as string;

  const [stage, setStage] = useState<Stage>('loading');
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [timeStatus, setTimeStatus] = useState<'upcoming' | 'active' | 'ended'>('active');
  const [errorMsg, setErrorMsg] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Countdown for upcoming tests
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Registration form
  const [candidate, setCandidate] = useState({
    name: '',
    email: '',
    rollNumber: '',
    phone: '',
    college: '',
    graduationYear: '',
    degree: '',
    github: '',
    linkedin: '',
    resumeUrl: '',
    experience: '',
  });
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [attemptId, setAttemptId] = useState('');

  // Pre-check state
  const [checks, setChecks] = useState({
    camera: false,
    mic: false,
    fullscreen: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Proctoring: Keep camera preview connected when precheck renders
  useEffect(() => {
    if (checks.camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [checks.camera]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [invitedCandidate, setInvitedCandidate] = useState<{ email: string; name?: string; token: string } | null>(null);

  const fetchTestData = () => {
    if (!link) return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const token = urlParams ? urlParams.get('token') : null;

    fetch(`/api/test/${link}${token ? `?token=${token}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStage('error');
          return;
        }

        setTestInfo(data.test);
        setCompanyInfo(data.company);
        setTimeStatus(data.timeStatus);

        if (data.startsInSeconds !== null && data.startsInSeconds !== undefined) {
          setRemainingSeconds(data.startsInSeconds);
          const diff = data.startsInSeconds;
          const d = Math.floor(diff / (60 * 60 * 24));
          const h = Math.floor((diff % (60 * 60 * 24)) / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;
          setCountdown({ days: d, hours: h, minutes: m, seconds: s });
        }

        if (data.invitedCandidate) {
          setInvitedCandidate(data.invitedCandidate);
          setCandidate((prev) => ({
            ...prev,
            email: data.invitedCandidate.email || prev.email,
            name: data.invitedCandidate.name || prev.name,
          }));
        }

        if (data.timeStatus === 'upcoming') {
          setStage('upcoming');
        } else if (data.timeStatus === 'ended') {
          setStage('ended');
        } else {
          setStage('info');
        }
      })
      .catch(() => {
        setErrorMsg('Failed to load assessment. Please verify your link URL.');
        setStage('error');
      });
  };

  useEffect(() => {
    fetchTestData();
  }, [link]);

  // Upcoming Countdown Timer (Server-Authoritative)
  useEffect(() => {
    if (stage !== 'upcoming' || remainingSeconds === null || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimeStatus('active');
          setStage('info');
          fetchTestData();
          return 0;
        }

        const next = prev - 1;
        const d = Math.floor(next / (60 * 60 * 24));
        const h = Math.floor((next % (60 * 60 * 24)) / 3600);
        const m = Math.floor((next % 3600) / 60);
        const s = next % 60;
        setCountdown({ days: d, hours: h, minutes: m, seconds: s });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, remainingSeconds]);

  const handleRegister = async () => {
    if (!candidate.name.trim() || !candidate.email.trim()) {
      setRegisterError('Please provide your name and email address.');
      return;
    }

    // Validate dynamic required fields
    const rf = testInfo?.registrationForm;
    if (rf) {
      if (rf.phone?.enabled && rf.phone?.required && !candidate.phone.trim()) {
        setRegisterError('Phone number is required.');
        return;
      }
      if (rf.rollNumber?.enabled && rf.rollNumber?.required && !candidate.rollNumber.trim()) {
        setRegisterError('Roll number / Student ID is required.');
        return;
      }
      if (rf.college?.enabled && rf.college?.required && !candidate.college.trim()) {
        setRegisterError('College / Institute name is required.');
        return;
      }
      if (rf.degree?.enabled && rf.degree?.required && !candidate.degree.trim()) {
        setRegisterError('Degree / Branch is required.');
        return;
      }
      if (rf.graduationYear?.enabled && rf.graduationYear?.required && !candidate.graduationYear.trim()) {
        setRegisterError('Graduation year is required.');
        return;
      }
      if (rf.experience?.enabled && rf.experience?.required && !candidate.experience.trim()) {
        setRegisterError('Work experience is required.');
        return;
      }
      if (rf.github?.enabled && rf.github?.required && !candidate.github.trim()) {
        setRegisterError('GitHub profile URL is required.');
        return;
      }
      if (rf.linkedin?.enabled && rf.linkedin?.required && !candidate.linkedin.trim()) {
        setRegisterError('LinkedIn profile URL is required.');
        return;
      }
      if (rf.resumeUrl?.enabled && rf.resumeUrl?.required && !candidate.resumeUrl.trim()) {
        setRegisterError('Resume link is required.');
        return;
      }
    }

    setRegistering(true);
    setRegisterError('');

    try {
      const res = await fetch(`/api/test/${link}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed');
        return;
      }

      setAttemptId(data.attemptId);

      const p = testInfo?.proctoring;
      const needsAny = p?.requireCamera || p?.requireMic || p?.requireFullScreen;
      if (!needsAny) {
        router.push(`/test/${link}/attempt/${data.attemptId}`);
      } else {
        setStage('precheck');
      }
    } catch {
      setRegisterError('Network error during registration. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const startCameraCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: Boolean(testInfo?.proctoring?.requireCamera),
        audio: Boolean(testInfo?.proctoring?.requireMic),
      });
      streamRef.current = stream;
      setChecks((c) => ({
        ...c,
        camera: Boolean(testInfo?.proctoring?.requireCamera),
        mic: Boolean(testInfo?.proctoring?.requireMic),
      }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      alert('Please allow camera/microphone permissions in your browser and try again.');
    }
  };

  const startFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setChecks((c) => ({ ...c, fullscreen: true }));
    } catch {
      alert('Please allow full screen mode.');
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setChecks((c) => ({ ...c, fullscreen: false }));
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const allChecksPassed = () => {
    if (!testInfo) return false;
    const p = testInfo.proctoring;
    if (p.requireCamera && !checks.camera) return false;
    if (p.requireMic && !checks.mic) return false;
    if (p.requireFullScreen && !checks.fullscreen) return false;
    return true;
  };

  const handleStartTest = () => {
    router.push(`/test/${link}/attempt/${attemptId}`);
  };

  // 1. Loading State
  if (stage === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          <span className="text-sm text-zinc-400">Loading assessment portal...</span>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Assessment Unavailable</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white transition"
            >
              <span>Return to CodeArena</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Upcoming Assessment State (Countdown)
  if (stage === 'upcoming') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(34,197,94,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="w-full max-w-2xl bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 sm:p-10 space-y-8 relative z-10 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.1] flex items-center justify-center shrink-0">
                {companyInfo?.logo ? (
                  <img src={companyInfo.logo} alt={companyInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-base text-green-400">
                    {companyInfo?.name ? companyInfo.name.charAt(0).toUpperCase() : 'C'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{companyInfo?.name || 'Organization'}</h3>
                {companyInfo?.website && (
                  <a
                    href={companyInfo.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300"
                  >
                    <span>{companyInfo.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Logo width={22} height={17} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Hourglass className="w-3.5 h-3.5 animate-pulse" />
              <span>Assessment Scheduled</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {testInfo?.title}
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              This assessment has not started yet. It will open automatically when the countdown completes.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-900/70 border border-white/[0.06] text-center">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white">{countdown.days}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mt-0.5">Days</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white">
                {countdown.hours.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mt-0.5">Hours</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white">
                {countdown.minutes.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mt-0.5">Minutes</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-green-400">
                {countdown.seconds.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mt-0.5">Seconds</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.04] space-y-1">
              <span className="text-zinc-500 text-[11px] block">Start Time</span>
              <span className="font-semibold text-zinc-200">
                {testInfo?.validFrom ? new Date(testInfo.validFrom).toLocaleString() : 'Scheduled'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.04] space-y-1">
              <span className="text-zinc-500 text-[11px] block">Duration & Questions</span>
              <span className="font-semibold text-zinc-200">
                {testInfo?.durationMinutes} Mins · {testInfo?.questionCount} Challenges
              </span>
            </div>
          </div>

          {testInfo?.instructions && (
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/[0.04] space-y-2">
              <span className="text-[11px] uppercase font-bold text-zinc-500">General Guidelines</span>
              <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed">
                {testInfo.instructions}
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-[11px] text-zinc-500">
              Keep this tab open. You will be able to register and begin as soon as the start time is reached.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Ended Assessment State
  if (stage === 'ended') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
            <Calendar className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-white">Assessment Has Ended</h1>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              The submission window for <strong>{testInfo?.title}</strong> closed on{' '}
              {testInfo?.validUntil ? new Date(testInfo.validUntil).toLocaleString() : 'the scheduled time'}.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.04] text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-zinc-500">Organization</span>
              <span className="font-semibold text-white">{companyInfo?.name}</span>
            </div>
            {companyInfo?.email && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Contact</span>
                <span className="text-zinc-300">{companyInfo.email}</span>
              </div>
            )}
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white transition"
            >
              <span>Return to CodeArena</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Active Assessment Landing & Instructions
  if (stage === 'info') {
    const hasProctoring =
      testInfo && Object.values(testInfo.proctoring).some((v) => typeof v === 'boolean' && v);

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 25%, rgba(34,197,94,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="w-full max-w-2xl bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 sm:p-10 space-y-8 relative z-10 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.1] flex items-center justify-center shrink-0 shadow-sm">
                {companyInfo?.logo ? (
                  <img src={companyInfo.logo} alt={companyInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-base text-green-400">
                    {companyInfo?.name ? companyInfo.name.charAt(0).toUpperCase() : 'C'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{companyInfo?.name || 'Organization'}</h3>
                {companyInfo?.website && (
                  <a
                    href={companyInfo.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300"
                  >
                    <span>{companyInfo.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Logo width={22} height={17} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {testInfo?.title}
            </h1>
            {testInfo?.description && (
              <p className="text-xs text-zinc-400 leading-relaxed">{testInfo.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-white/[0.06] text-xs font-semibold text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-green-400" />
                <span>{testInfo?.durationMinutes} Minutes</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-white/[0.06] text-xs font-semibold text-zinc-300">
                <FileCode2 className="w-3.5 h-3.5 text-green-400" />
                <span>{testInfo?.questionCount} Questions</span>
              </span>

              {testInfo?.validUntil && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-white/[0.06] text-xs font-semibold text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Expires {new Date(testInfo.validUntil).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>

          {hasProctoring && (
            <div className="p-4 rounded-2xl bg-green-500/[0.04] border border-green-500/20 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Proctoring Enabled
                </h4>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {testInfo?.proctoring.requireCamera && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300">
                    <Camera className="w-3 h-3 text-green-400" /> Webcam Monitored
                  </span>
                )}
                {testInfo?.proctoring.requireMic && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300">
                    <Mic className="w-3 h-3 text-green-400" /> Mic Active
                  </span>
                )}
                {testInfo?.proctoring.requireFullScreen && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300">
                    <Maximize2 className="w-3 h-3 text-green-400" /> Full Screen Required
                  </span>
                )}
                {testInfo?.proctoring.preventTabSwitch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300">
                    <EyeOff className="w-3 h-3 text-amber-400" /> Tab Switch Monitored (Max {testInfo.proctoring.maxTabSwitches})
                  </span>
                )}
                {testInfo?.proctoring.disableCopyPaste && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300">
                    <ClipboardX className="w-3 h-3 text-green-400" /> External Copy-Paste Disabled
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Default Standard Assessment Guidelines */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-green-400" />
              <span>Assessment Rules & Guidelines</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5 text-xs text-zinc-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-md bg-green-500/10 text-green-400 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-white block font-semibold">Continuous Non-Stop Timer</strong>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Once started, the timer runs continuously ({testInfo?.durationMinutes} mins) and cannot be paused. Your solutions will be automatically submitted when time expires.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-md bg-green-500/10 text-green-400 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-white block font-semibold">Multiple Languages & Test Cases</strong>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Write code in C++, C, Python, Java, or Go. You can test your code against sample cases or custom inputs anytime before submitting each question.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-md bg-green-500/10 text-green-400 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-white block font-semibold">Honor Code & Anti-Cheating Policy</strong>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    All submissions are checked for plagiarism and authenticity. Tab switches, external pasting, and window unfocusing are actively logged and may result in immediate disqualification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Company-Specific Custom Instructions */}
          {testInfo?.instructions && (
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/[0.06] space-y-2">
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Special Instructions from {companyInfo?.name || 'Company'}</span>
              </span>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                {testInfo.instructions}
              </p>
            </div>
          )}

          {/* Agreement Checkbox */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-green-500"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                I confirm that I will take this assessment independently without unauthorized aids or plagiarism. I have read, understood, and agree to the{' '}
                <strong className="text-white font-medium">assessment instructions, honor code, and proctoring rules</strong>.
              </span>
            </label>
          </div>

          <button
            type="button"
            disabled={!agreedToTerms}
            onClick={() => setStage('register')}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition active:scale-[0.98] cursor-pointer ${
              agreedToTerms
                ? 'bg-green-500 hover:bg-green-400 text-black shadow-green-500/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
            }`}
          >
            <span>Agree & Proceed to Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 6. Registration Form Stage (Dynamic Fields configured by Company)
  if (stage === 'register') {
    const rf = testInfo?.registrationForm || {
      phone: { enabled: true, required: false },
      rollNumber: { enabled: true, required: false },
      college: { enabled: true, required: false },
    };

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setStage('info')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition block mb-2 cursor-pointer"
            >
              ← Back to Details
            </button>
            <h2 className="text-xl font-extrabold text-white">Candidate Registration</h2>
            <p className="text-xs text-zinc-500">{testInfo?.title}</p>
          </div>

          {invitedCandidate && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Verified Personal Invitation for <strong>{invitedCandidate.name || invitedCandidate.email}</strong></span>
            </div>
          )}

          {registerError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {registerError}
            </div>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Core Required: Name & Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={candidate.name}
                onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
                placeholder="Enter your email address"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
              />
            </div>

            {/* Dynamic Configured Fields */}
            {rf.phone?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Phone Number {rf.phone?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required={rf.phone?.required}
                    value={candidate.phone}
                    onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })}
                    placeholder="Enter your contact phone number"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <Phone className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            {rf.rollNumber?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Roll Number / Student ID {rf.rollNumber?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={rf.rollNumber?.required}
                    value={candidate.rollNumber}
                    onChange={(e) => setCandidate({ ...candidate, rollNumber: e.target.value })}
                    placeholder="Enter your roll number or student ID"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <FileBadge className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            {rf.college?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  College / Institute Name {rf.college?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={rf.college?.required}
                    value={candidate.college}
                    onChange={(e) => setCandidate({ ...candidate, college: e.target.value })}
                    placeholder="Enter your college or university name"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <GraduationCap className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rf.degree?.enabled && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Degree & Branch {rf.degree?.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    required={rf.degree?.required}
                    value={candidate.degree}
                    onChange={(e) => setCandidate({ ...candidate, degree: e.target.value })}
                    placeholder="Enter degree (e.g. B.Tech CS)"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                </div>
              )}

              {rf.graduationYear?.enabled && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Graduation Year {rf.graduationYear?.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    required={rf.graduationYear?.required}
                    value={candidate.graduationYear}
                    onChange={(e) => setCandidate({ ...candidate, graduationYear: e.target.value })}
                    placeholder="Enter graduation year (e.g. 2026)"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                </div>
              )}
            </div>

            {rf.experience?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Years of Experience {rf.experience?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={rf.experience?.required}
                    value={candidate.experience}
                    onChange={(e) => setCandidate({ ...candidate, experience: e.target.value })}
                    placeholder="Enter experience (e.g. Fresher / 1+ years)"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <Briefcase className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            {rf.github?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  GitHub Profile URL {rf.github?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required={rf.github?.required}
                    value={candidate.github}
                    onChange={(e) => setCandidate({ ...candidate, github: e.target.value })}
                    placeholder="https://github.com/your-username"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <Github className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            {rf.linkedin?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  LinkedIn Profile URL {rf.linkedin?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required={rf.linkedin?.required}
                    value={candidate.linkedin}
                    onChange={(e) => setCandidate({ ...candidate, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/your-profile"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <Linkedin className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}

            {rf.resumeUrl?.enabled && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Resume / Portfolio Link {rf.resumeUrl?.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required={rf.resumeUrl?.required}
                    value={candidate.resumeUrl}
                    onChange={(e) => setCandidate({ ...candidate, resumeUrl: e.target.value })}
                    placeholder="https://drive.google.com/your-resume-link"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-green-500/50"
                  />
                  <FileText className="absolute right-3.5 top-3 w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={registering || !candidate.name.trim() || !candidate.email.trim()}
            onClick={handleRegister}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-lg shadow-green-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {registering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span>Proceed to Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 7. Pre-check Stage (Webcam / Fullscreen verification)
  if (stage === 'precheck') {
    const p = testInfo!.proctoring;
    const needsCamera = p.requireCamera || p.requireMic;
    const needsFullscreen = p.requireFullScreen;
    const allOk = allChecksPassed();

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">System Pre-Check</h2>
            <p className="text-xs text-zinc-400">
              Please grant required hardware permissions before starting <strong>{testInfo?.title}</strong>
            </p>
          </div>

          <div className="space-y-4">
            {needsCamera && (
              <div
                className={`p-4 rounded-2xl border transition ${
                  checks.camera
                    ? 'bg-green-500/[0.04] border-green-500/30'
                    : 'bg-zinc-900/50 border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-green-400" />
                      <h4 className="text-xs font-bold text-white">Webcam & Microphone Permission</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Allow browser access to verify your testing environment.
                    </p>

                    {checks.camera && (
                      <div className="w-32 h-24 rounded-lg overflow-hidden border border-green-500/40 mt-2">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      </div>
                    )}
                  </div>

                  {!checks.camera ? (
                    <button
                      type="button"
                      onClick={startCameraCheck}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      Enable Access
                    </button>
                  ) : (
                    <span className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {needsFullscreen && (
              <div
                className={`p-4 rounded-2xl border transition ${
                  checks.fullscreen
                    ? 'bg-green-500/[0.04] border-green-500/30'
                    : 'bg-zinc-900/50 border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-green-400" />
                      <h4 className="text-xs font-bold text-white">Full Screen Mode</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Enter full screen mode to minimize distractions.
                    </p>
                  </div>

                  {!checks.fullscreen ? (
                    <button
                      type="button"
                      onClick={startFullscreen}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      Enter Full Screen
                    </button>
                  ) : (
                    <span className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!allOk}
              onClick={handleStartTest}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 text-black text-sm font-bold shadow-lg shadow-green-500/20 transition disabled:opacity-40 cursor-pointer"
            >
              <span>Start Assessment Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
