'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  Clock,
  Play,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Camera,
  ShieldAlert,
  Send,
  Star,
  Check,
  Code2,
  FileText,
  Terminal,
  Loader2,
  Sparkles,
  RotateCcw,
  Aperture,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Read input and solve problem\n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Read input and solve problem\n    return 0;\n}`,
  python: `# Read input and solve problem\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and solve problem\n    }\n}`,
  go: `package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    // Read input and solve problem\n}`,
};

interface Question {
  problemId: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleTestcases?: { input: string; output: string; explanation?: string }[];
}

interface ProctoringConfig {
  requireCamera: boolean;
  requireMic: boolean;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
  requireFullScreen: boolean;
  disableCopyPaste: boolean;
}

export default function TestAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const link = params?.link as string;
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<{
    id: string;
    title: string;
    durationMinutes: number;
    questions: Question[];
    proctoring: ProctoringConfig;
  } | null>(null);

  const [company, setCompany] = useState<{ name: string; logo: string } | null>(null);
  const [candidate, setCandidate] = useState<{ name: string; email: string } | null>(null);

  // Question navigation
  const [currentIdx, setCurrentIdx] = useState(0);
  const [language, setLanguage] = useState('cpp');
  const [codes, setCodes] = useState<Record<number, Record<string, string>>>({});

  // Resizable Panes State
  const [leftWidth, setLeftWidth] = useState(45);
  const [topHeight, setTopHeight] = useState(62);
  const [isResizingHz, setIsResizingHz] = useState(false);
  const [isResizingVt, setIsResizingVt] = useState(false);
  const [isEditorMaximized, setIsEditorMaximized] = useState(false);
  const [isProblemMaximized, setIsProblemMaximized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  // Answers status tracking
  const [solvedMap, setSolvedMap] = useState<Record<number, boolean>>({});
  const [scoresMap, setScoresMap] = useState<Record<number, number>>({});

  // Execution & Output Terminal
  const [bottomTab, setBottomTab] = useState<'testcases' | 'output'>('testcases');
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Proctoring Violations
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<'easy' | 'just_right' | 'hard'>('just_right');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [submittingTest, setSubmittingTest] = useState(false);

  // Load Attempt and Test Data
  useEffect(() => {
    if (!attemptId) return;

    fetch(`/api/test/attempt/${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }

        if (data.attempt.status === 'submitted' || data.attempt.status === 'terminated') {
          router.replace(`/test/${link}/result/${attemptId}`);
          return;
        }

        setTest(data.test);
        setCompany(data.company);
        setCandidate(data.attempt.candidate);
        setTabSwitches(data.attempt.tabSwitchCount || 0);

        // Populate existing answers
        if (data.attempt.answers && Array.isArray(data.attempt.answers)) {
          const sMap: Record<number, boolean> = {};
          const scMap: Record<number, number> = {};
          const cMap: Record<number, Record<string, string>> = {};

          data.attempt.answers.forEach((ans: any) => {
            if (ans.status === 'Accepted') sMap[ans.problemId] = true;
            if (ans.score) scMap[ans.problemId] = ans.score;
            if (ans.code && ans.language) {
              if (!cMap[ans.problemId]) cMap[ans.problemId] = {};
              cMap[ans.problemId][ans.language] = ans.code;
            }
          });

          setSolvedMap(sMap);
          setScoresMap(scMap);
          setCodes(cMap);
        }

        // Start Attempt on server if not started
        fetch(`/api/test/attempt/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });

        // Compute Timer
        const startedAtMs = data.attempt.startedAt
          ? new Date(data.attempt.startedAt).getTime()
          : Date.now();
        const durationMs = data.test.durationMinutes * 60 * 1000;
        const endTime = startedAtMs + durationMs;
        setTargetEndTime(endTime);
        setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load test attempt');
        setLoading(false);
      });
  }, [attemptId, link, router]);

  // Handle Drag / Resize Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingHz && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        // Clamp between 20% and 80%
        if (newWidth >= 20 && newWidth <= 80) {
          setLeftWidth(newWidth);
        }
      } else if (isResizingVt && rightPaneRef.current) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
        // Clamp between 25% and 85%
        if (newHeight >= 25 && newHeight <= 85) {
          setTopHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingHz(false);
      setIsResizingVt(false);
      document.body.style.userSelect = 'auto';
    };

    if (isResizingHz || isResizingVt) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHz, isResizingVt]);

  // Active Question
  const activeQuestion = test?.questions?.[currentIdx];
  const activeCode =
    (activeQuestion && codes[activeQuestion.problemId]?.[language]) ||
    BOILERPLATES[language] ||
    '';

  const handleCodeChange = (newCode: string | undefined) => {
    if (!activeQuestion || newCode === undefined) return;
    setCodes((prev) => ({
      ...prev,
      [activeQuestion.problemId]: {
        ...(prev[activeQuestion.problemId] || {}),
        [language]: newCode,
      },
    }));
  };

  const handleResetCode = () => {
    if (!activeQuestion) return;
    const defaultCode = BOILERPLATES[language] || '';
    handleCodeChange(defaultCode);
    toast.info('Code reset to default boilerplate');
  };

  // Timer Tick
  useEffect(() => {
    if (!targetEndTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remain = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      setTimeLeft(remain);

      if (remain <= 0) {
        clearInterval(interval);
        toast.error('Time is up! Submitting your assessment...');
        handleFinalSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetEndTime]);

  // Proctoring: Webcam stream
  useEffect(() => {
    if (test?.proctoring?.requireCamera) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: Boolean(test.proctoring.requireMic) })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          toast.warning('Webcam access was interrupted.');
        });
    }
  }, [test]);

  // Proctoring: Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && test?.proctoring?.requireFullScreen) {
        toast.error('Warning: Please stay in Full Screen mode.');
        fetch(`/api/test/attempt/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'violation', type: 'fullscreen_exit' }),
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [attemptId, test]);

  // Proctoring: Tab Switch / Visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && test?.proctoring?.preventTabSwitch) {
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        const max = test.proctoring.maxTabSwitches || 3;

        toast.error(
          `Security Alert: Tab switch detected (${newCount}/${max}). Avoid switching tabs!`
        );

        fetch(`/api/test/attempt/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'violation', type: 'tab_switch' }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === 'terminated') {
              toast.error('Your assessment was terminated due to repeated tab switches.');
              router.replace(`/test/${link}/result/${attemptId}`);
            }
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attemptId, link, router, tabSwitches, test]);

  // Proctoring: Disable copy-paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (test?.proctoring?.disableCopyPaste) {
        e.preventDefault();
        toast.warning('External copy-pasting is restricted during this assessment.');
        fetch(`/api/test/attempt/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'violation', type: 'copy_paste' }),
        });
      }
    },
    [attemptId, test]
  );

  // Polling helper for code execution
  const pollExecution = (execId: string, type: 'Run' | 'Submit', probId: number) => {
    let attempts = 0;
    const maxAttempts = 80;

    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/submission-status/${execId}`);
        const data = await res.json();

        if (data.status && data.status !== 'PENDING') {
          setIsExecuting(false);
          setExecutionResult(data);
          setBottomTab('output');

          if (type === 'Submit') {
            const isAcc = data.status === 'Accepted';
            if (isAcc) {
              setSolvedMap((prev) => ({ ...prev, [probId]: true }));
              const earned = activeQuestion?.points || 10;
              setScoresMap((prev) => ({ ...prev, [probId]: earned }));
              toast.success(`Question Accepted! +${earned} pts`);
            } else {
              toast.error(`Submission Result: ${data.status}`);
            }

            // Record answer on server
            fetch(`/api/test/attempt/${attemptId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'answer',
                problemId: probId,
                code: activeCode,
                language,
                status: isAcc ? 'Accepted' : 'Rejected',
                score: isAcc ? activeQuestion?.points || 10 : 0,
                execCodeId: execId,
              }),
            });
          } else {
            toast.info(`Run Completed: ${data.status}`);
          }
          return;
        }

        if (attempts >= maxAttempts) {
          setIsExecuting(false);
          toast.error('Execution timed out. Please try again.');
          return;
        }

        setTimeout(check, 250);
      } catch {
        setIsExecuting(false);
        toast.error('Failed to get execution status');
      }
    };

    setTimeout(check, 100);
  };

  // Run Code Action
  const handleRunCode = async () => {
    if (!activeQuestion) return;
    setIsExecuting(true);
    setExecutionResult(null);

    const testcasesToRun = useCustomInput
      ? [{ input: customInput, output: '' }]
      : (activeQuestion.sampleTestcases || []).map((tc) => ({
          input: tc.input,
          output: tc.output,
        }));

    try {
      const res = await fetch('/api/battle/exec-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeCode,
          language,
          codeType: 'test',
          difficulty: activeQuestion.difficulty || 'medium',
          problemId: activeQuestion.problemId,
          type: useCustomInput ? 'Custom' : 'Run',
          testcases: testcasesToRun,
        }),
      });

      const data = await res.json();
      if (data.success && data.executionCode) {
        const execId = data.executionCode._id || data.executionCode.id;
        pollExecution(execId, 'Run', activeQuestion.problemId);
      } else {
        setIsExecuting(false);
        toast.error(data.error || 'Failed to initiate execution');
      }
    } catch {
      setIsExecuting(false);
      toast.error('Network error executing code');
    }
  };

  // Submit Question Action
  const handleSubmitQuestion = async () => {
    if (!activeQuestion) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/battle/exec-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeCode,
          language,
          codeType: 'test',
          difficulty: activeQuestion.difficulty || 'medium',
          problemId: activeQuestion.problemId,
          type: 'Submit',
        }),
      });

      const data = await res.json();
      if (data.success && data.executionCode) {
        const execId = data.executionCode._id || data.executionCode.id;
        pollExecution(execId, 'Submit', activeQuestion.problemId);
      } else {
        setIsExecuting(false);
        toast.error(data.error || 'Failed to submit problem');
      }
    } catch {
      setIsExecuting(false);
      toast.error('Network error submitting question');
    }
  };

  // Final Assessment Submit (with feedback)
  const handleFinalSubmit = async () => {
    setSubmittingTest(true);

    const answersPayload = (test?.questions || []).map((q) => ({
      problemId: q.problemId,
      code: codes[q.problemId]?.[language] || '',
      language,
      status: solvedMap[q.problemId] ? 'Accepted' : 'Rejected',
      score: scoresMap[q.problemId] || 0,
    }));

    try {
      const res = await fetch(`/api/test/attempt/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          answers: answersPayload,
          feedback: {
            rating: feedbackRating,
            difficultyRating: feedbackDifficulty,
            comments: feedbackComments,
          },
        }),
      });

      if (res.ok) {
        toast.success('Assessment submitted successfully!');
        router.replace(`/test/${link}/result/${attemptId}`);
      } else {
        toast.error('Failed to submit test');
      }
    } catch {
      toast.error('Network error during test submission');
    } finally {
      setSubmittingTest(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !test) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          <span className="text-sm text-zinc-400">Loading your test environment...</span>
        </div>
      </div>
    );
  }

  const sampleCases = activeQuestion?.sampleTestcases || [];

  return (
    <div
      onPaste={handlePaste}
      className="flex flex-col h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden select-none"
    >
      {/* TOP NAV BAR */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          {company?.logo ? (
            <img src={company.logo} alt={company.name} className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-xs font-black text-green-400">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white truncate max-w-xs">{test.title}</span>
            <span className="text-[10px] text-zinc-400">{candidate?.name}</span>
          </div>
        </div>

        {/* Center Timer & Proctoring Monitor */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono ${
              timeLeft < 300
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-zinc-900 border-white/[0.1] text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-green-400" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {test.proctoring?.preventTabSwitch && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-[11px] text-zinc-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Violations: {tabSwitches}/{test.proctoring.maxTabSwitches}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Test</span>
          </button>
        </div>
      </header>

      {/* QUESTION TABS BAR */}
      <div className="bg-[#0c0c0e]/80 border-b border-white/[0.06] px-4 py-1.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {test.questions.map((q, idx) => {
            const isSolved = solvedMap[q.problemId];
            const isCurrent = idx === currentIdx;

            return (
              <button
                key={q.problemId}
                onClick={() => {
                  setCurrentIdx(idx);
                  setExecutionResult(null);
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-white/[0.14] text-white border border-white/[0.18]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {isSolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex items-center justify-center text-[9px] font-mono">
                    {idx + 1}
                  </span>
                )}
                <span>Q{idx + 1}: {q.title}</span>
                <span className="text-[10px] text-zinc-500 font-normal">({q.points} pts)</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
          <span className="font-semibold text-zinc-300">
            Solved: <span className="text-green-400">{Object.keys(solvedMap).length}</span> / {test.questions.length}
          </span>
        </div>
      </div>

      {/* MAIN SPLIT PANE (DRAGGABLE & RESIZABLE) */}
      <div ref={containerRef} className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        {/* LEFT PANE: Question Problem Statement */}
        <div
          style={{
            width: isEditorMaximized ? '0%' : isProblemMaximized ? '100%' : `${leftWidth}%`,
            display: isEditorMaximized ? 'none' : 'flex',
          }}
          className="flex flex-col bg-[#09090b] overflow-hidden min-w-0"
        >
          <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0c0c0e]/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Problem Statement</h2>
            </div>
            <div className="flex items-center gap-2">
              {activeQuestion && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    activeQuestion.difficulty === 'easy'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : activeQuestion.difficulty === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {activeQuestion.difficulty}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsProblemMaximized(!isProblemMaximized)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                title={isProblemMaximized ? 'Restore View' : 'Maximize Problem'}
              >
                {isProblemMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
            {activeQuestion ? (
              <>
                <div className="space-y-1">
                  <h1 className="text-xl font-extrabold text-white">
                    {activeQuestion.title}
                  </h1>
                  <p className="text-xs text-zinc-500">
                    Maximum Score: {activeQuestion.points} points
                  </p>
                </div>

                <div className="whitespace-pre-line text-zinc-300 leading-relaxed text-xs sm:text-sm">
                  {activeQuestion.description || 'No description provided.'}
                </div>

                {activeQuestion.inputFormat && (
                  <div className="space-y-1.5 bg-[#0c0c0e] p-4 rounded-xl border border-white/[0.06]">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Input Format
                    </h4>
                    <p className="text-xs text-zinc-400 whitespace-pre-line font-mono">
                      {activeQuestion.inputFormat}
                    </p>
                  </div>
                )}

                {activeQuestion.outputFormat && (
                  <div className="space-y-1.5 bg-[#0c0c0e] p-4 rounded-xl border border-white/[0.06]">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Output Format
                    </h4>
                    <p className="text-xs text-zinc-400 whitespace-pre-line font-mono">
                      {activeQuestion.outputFormat}
                    </p>
                  </div>
                )}

                {activeQuestion.constraints && (
                  <div className="space-y-1.5 bg-[#0c0c0e] p-4 rounded-xl border border-white/[0.06]">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Constraints
                    </h4>
                    <p className="text-xs text-zinc-400 whitespace-pre-line font-mono">
                      {activeQuestion.constraints}
                    </p>
                  </div>
                )}

                {/* Sample Testcases */}
                {sampleCases.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Sample Test Cases
                    </h3>
                    {sampleCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0c0c0e] border border-white/[0.06] rounded-xl p-4 space-y-3"
                      >
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          Sample #{idx + 1}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1 font-semibold">Input:</span>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-300 overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1 font-semibold">Output:</span>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-300 overflow-x-auto">
                              {tc.output}
                            </pre>
                          </div>
                        </div>
                        {tc.explanation && (
                          <p className="text-xs text-zinc-400 italic mt-1">
                            Explanation: {tc.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-zinc-600">Select a question to view details.</div>
            )}
          </div>
        </div>

        {/* HORIZONTAL DRAGGABLE RESIZE DIVIDER */}
        {!isEditorMaximized && !isProblemMaximized && (
          <div
            onMouseDown={() => setIsResizingHz(true)}
            className="w-2 bg-[#09090b] border-x border-white/[0.06] flex items-center justify-center group outline-none hover:bg-zinc-800 transition-colors active:bg-zinc-700 cursor-col-resize shrink-0 z-10"
            title="Drag to resize panels"
          >
            <div
              className={`w-0.5 h-8 rounded-full transition-colors ${
                isResizingHz ? 'bg-green-400' : 'bg-zinc-700/60 group-hover:bg-zinc-400'
              }`}
            />
          </div>
        )}

        {/* RIGHT PANE: Code Editor & Testing Console */}
        <div
          ref={rightPaneRef}
          style={{
            width: isProblemMaximized ? '0%' : isEditorMaximized ? '100%' : `${100 - leftWidth}%`,
            display: isProblemMaximized ? 'none' : 'flex',
          }}
          className="flex-1 flex flex-col bg-[#09090b] min-w-0 overflow-hidden"
        >
          {/* Top Half: Code Editor */}
          <div
            style={{ height: `${topHeight}%` }}
            className="flex flex-col bg-[#0c0c0e] shrink-0 min-h-[160px] overflow-hidden"
          >
            {/* Editor Toolbar */}
            <div className="h-11 border-b border-white/[0.08] bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-green-400" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-zinc-900 border border-white/[0.08] text-xs font-semibold text-zinc-200 px-3 py-1.5 rounded-xl focus:outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="cpp">C++ (GCC 11)</option>
                    <option value="c">C (GCC 11)</option>
                    <option value="python">Python 3.10</option>
                    <option value="java">Java 17</option>
                    <option value="go">Go 1.19</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  title="Reset code template"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {solvedMap[activeQuestion?.problemId || 0] && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                    <Check className="w-3 h-3" /> Solved
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                  title={isEditorMaximized ? 'Restore View' : 'Maximize Editor'}
                >
                  {isEditorMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-white/[0.08] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Play className={`w-3 h-3 text-amber-400 ${isExecuting ? 'animate-pulse' : ''}`} />
                  <span>Run</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitQuestion}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md shadow-green-500/10 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Upload className={`w-3 h-3 ${isExecuting ? 'animate-bounce' : ''}`} />
                  <span>Submit Question</span>
                </button>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 relative bg-[#09090b]">
              <Editor
                height="100%"
                language={language === 'c' ? 'c' : language === 'go' ? 'go' : language}
                value={activeCode}
                onChange={handleCodeChange}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* VERTICAL DRAGGABLE RESIZE DIVIDER */}
          <div
            onMouseDown={() => setIsResizingVt(true)}
            className="h-2 bg-[#09090b] border-y border-white/[0.06] flex items-center justify-center group outline-none hover:bg-zinc-800 transition-colors active:bg-zinc-700 cursor-row-resize shrink-0 z-10"
            title="Drag to resize console / testcases"
          >
            <div
              className={`h-0.5 w-10 rounded-full transition-colors ${
                isResizingVt ? 'bg-green-400' : 'bg-zinc-700/60 group-hover:bg-zinc-400'
              }`}
            />
          </div>

          {/* Bottom Half: Test Cases & Terminal Output */}
          <div className="flex-1 flex flex-col bg-[#0c0c0e] min-h-[120px] overflow-hidden">
            {/* Bottom Tabs Header */}
            <div className="h-10 border-b border-white/[0.06] bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setBottomTab('testcases')}
                  className={`flex items-center gap-1.5 text-xs font-bold py-2.5 transition border-b-2 cursor-pointer ${
                    bottomTab === 'testcases'
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Test Cases</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTab('output')}
                  className={`flex items-center gap-1.5 text-xs font-bold py-2.5 transition border-b-2 cursor-pointer ${
                    bottomTab === 'output'
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Output / Console</span>
                  {executionResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionResult.status === 'Accepted'
                          ? 'bg-green-400'
                          : 'bg-red-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              {isExecuting && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400" />
                  <span>Running code...</span>
                </div>
              )}
            </div>

            {/* Bottom Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {bottomTab === 'testcases' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {sampleCases.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setUseCustomInput(false);
                            setActiveTestCaseIdx(idx);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            !useCustomInput && activeTestCaseIdx === idx
                              ? 'bg-white/[0.12] text-white'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Case #{idx + 1}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setUseCustomInput(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          useCustomInput
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        + Custom Input
                      </button>
                    </div>
                  </div>

                  {useCustomInput ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400">
                        Custom Standard Input (stdin):
                      </label>
                      <textarea
                        rows={4}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom input to feed to your program..."
                        className="w-full p-3 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs font-mono text-zinc-200 focus:outline-none focus:border-green-500/50 resize-none"
                      />
                    </div>
                  ) : sampleCases[activeTestCaseIdx] ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1 font-semibold uppercase">
                          Input:
                        </span>
                        <pre className="p-3 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-300 overflow-x-auto">
                          {sampleCases[activeTestCaseIdx].input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1 font-semibold uppercase">
                          Expected Output:
                        </span>
                        <pre className="p-3 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-300 overflow-x-auto">
                          {sampleCases[activeTestCaseIdx].output}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">No testcases available.</p>
                  )}
                </div>
              ) : (
                /* TAB: Output / Console */
                <div className="space-y-4">
                  {!executionResult ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Click <strong className="text-zinc-300">Run</strong> to test your code or <strong className="text-green-400">Submit Question</strong> to evaluate against all test cases.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                              executionResult.status === 'Accepted'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {executionResult.status}
                          </span>
                          {executionResult.exec_time !== undefined && (
                            <span className="text-xs text-zinc-500 font-mono">
                              {executionResult.exec_time} ms
                            </span>
                          )}
                        </div>
                      </div>

                      {executionResult.errorMsg && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400">
                          {executionResult.errorMsg}
                        </div>
                      )}

                      {executionResult.actual_output !== undefined && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-1 font-semibold uppercase">
                            Your Program Output:
                          </span>
                          <pre className="p-3 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-200 overflow-x-auto">
                            {executionResult.actual_output || '(Empty Output)'}
                          </pre>
                        </div>
                      )}

                      {executionResult.expected_output !== undefined && executionResult.expected_output && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-1 font-semibold uppercase">
                            Expected Output:
                          </span>
                          <pre className="p-3 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-400 overflow-x-auto">
                            {executionResult.expected_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Proctoring Webcam Picture-in-Picture */}
      {test.proctoring?.requireCamera && (
        <div className="fixed bottom-4 right-4 z-30 w-36 h-28 rounded-2xl overflow-hidden border border-white/[0.15] bg-black shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>LIVE CAM</span>
          </div>
        </div>
      )}

      {/* POST-TEST FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-white/[0.12] rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Complete Assessment</h3>
              <p className="text-xs text-zinc-400">
                You have answered <span className="text-green-400 font-bold">{Object.keys(solvedMap).length}</span> out of {test.questions.length} problems.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Rate your assessment experience:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1.5 rounded-lg hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= feedbackRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700 hover:text-zinc-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  How was the difficulty?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'easy', label: 'Easy' },
                    { id: 'just_right', label: 'Just Right' },
                    { id: 'hard', label: 'Hard' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFeedbackDifficulty(id as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        feedbackDifficulty === id
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-zinc-900 border border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Comments or Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Share your thoughts about this assessment..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-green-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                disabled={submittingTest}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition cursor-pointer"
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submittingTest}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md shadow-green-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submittingTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Confirm & Finish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
