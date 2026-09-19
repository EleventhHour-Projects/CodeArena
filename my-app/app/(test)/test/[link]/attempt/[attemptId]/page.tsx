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
        ?.getUserMedia({ video: true, audio: test.proctoring.requireMic })
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
        }).then((res) => res.json()).then((data) => {
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
              toast.error(`Submission Failed: ${data.status}`);
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
          toast.error('Execution timed out');
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
          difficulty: activeQuestion.difficulty,
          problemId: activeQuestion.problemId,
          type: 'Run',
          testcases: testcasesToRun,
        }),
      });

      const data = await res.json();
      if (data.success) {
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
          difficulty: activeQuestion.difficulty,
          problemId: activeQuestion.problemId,
          type: 'Submit',
        }),
      });

      const data = await res.json();
      if (data.success) {
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
        <div className="flex items-center gap-4">
          {company?.logo ? (
            <img src={company.logo} alt={company.name} className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-xs font-black text-green-400">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white truncate max-w-xs">{test.title}</span>
            <span className="text-[10px] text-zinc-500">{candidate?.name}</span>
          </div>
        </div>

        {/* Center Timer */}
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
              <ShieldAlert className="w-3 h-3 text-amber-400" />
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish Test</span>
          </button>
        </div>
      </header>

      {/* QUESTION TABS BAR */}
      <div className="bg-[#0c0c0e]/60 border-b border-white/[0.06] px-4 py-1.5 flex items-center justify-between gap-3 shrink-0">
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
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                  isCurrent
                    ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {isSolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex items-center justify-center text-[9px]">
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
          <span>
            Solved: {Object.keys(solvedMap).length}/{test.questions.length}
          </span>
        </div>
      </div>

      {/* MAIN SPLIT PANE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANE: Question Problem Statement */}
        <div className="w-full lg:w-1/2 border-r border-white/[0.08] flex flex-col bg-[#09090b] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0c0c0e]/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-bold text-white">Problem Statement</h2>
            </div>
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

                <div className="whitespace-pre-line text-zinc-300 leading-relaxed">
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
                            <span className="text-[10px] text-zinc-500 block mb-1">Input:</span>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">Output:</span>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto">
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

        {/* RIGHT PANE: Code Editor & Terminal */}
        <div className="w-full lg:w-1/2 flex flex-col bg-[#09090b] overflow-hidden">
          {/* Editor Header: Language selector */}
          <div className="h-10 border-b border-white/[0.08] bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-green-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-900 border border-white/[0.08] text-xs font-semibold text-zinc-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-green-500"
              >
                <option value="cpp">C++ (GCC)</option>
                <option value="python">Python 3</option>
                <option value="java">Java (OpenJDK)</option>
                <option value="c">C</option>
                <option value="go">Go</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {solvedMap[activeQuestion?.problemId || 0] && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                  <Check className="w-3 h-3" /> Solved
                </span>
              )}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-[300px] relative">
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
              }}
            />
          </div>

          {/* Bottom Execution & Terminal Drawer */}
          <div className="h-60 border-t border-white/[0.08] bg-[#0c0c0e] flex flex-col shrink-0">
            {/* Action buttons + Tabs */}
            <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBottomTab('testcases')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    bottomTab === 'testcases'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Test Cases
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab('output')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    bottomTab === 'output'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Execution Result
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExecuting}
                  onClick={handleRunCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/[0.1] transition disabled:opacity-50"
                >
                  {isExecuting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-green-400" />
                  )}
                  <span>Run Code</span>
                </button>

                <button
                  type="button"
                  disabled={isExecuting}
                  onClick={handleSubmitQuestion}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isExecuting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Question</span>
                </button>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
              {bottomTab === 'testcases' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {sampleCases.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setActiveTestCaseIdx(i);
                          setUseCustomInput(false);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          !useCustomInput && activeTestCaseIdx === i
                            ? 'bg-white/[0.15] text-white'
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Case {i + 1}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setUseCustomInput(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        useCustomInput
                          ? 'bg-white/[0.15] text-white'
                          : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Custom Input
                    </button>
                  </div>

                  {useCustomInput ? (
                    <div>
                      <textarea
                        rows={3}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom input test case here..."
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-zinc-200 text-xs font-mono focus:outline-none focus:border-green-500 resize-none"
                      />
                    </div>
                  ) : sampleCases[activeTestCaseIdx] ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1">Input:</span>
                        <pre className="p-2 rounded-lg bg-zinc-950 text-zinc-300">
                          {sampleCases[activeTestCaseIdx].input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1">Expected Output:</span>
                        <pre className="p-2 rounded-lg bg-zinc-950 text-zinc-300">
                          {sampleCases[activeTestCaseIdx].output}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-600">No test cases available.</p>
                  )}
                </div>
              ) : (
                /* Execution Output Tab */
                <div>
                  {isExecuting ? (
                    <div className="flex items-center gap-2 text-zinc-400 py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                      <span>Executing code in test sandbox...</span>
                    </div>
                  ) : executionResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            executionResult.status === 'Accepted'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {executionResult.status}
                        </span>

                        {executionResult.time && (
                          <span className="text-zinc-500 text-[11px]">
                            Runtime: {executionResult.time}
                          </span>
                        )}
                      </div>

                      {executionResult.error && (
                        <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 whitespace-pre-wrap">
                          {executionResult.error}
                        </div>
                      )}

                      {executionResult.output && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-1">Your Output:</span>
                          <pre className="p-2.5 rounded-lg bg-zinc-950 text-zinc-300 whitespace-pre-wrap">
                            {executionResult.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-600 py-6">Click "Run Code" or "Submit Question" to see results.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Webcam Preview Bubble if Required */}
      {test.proctoring?.requireCamera && (
        <div className="fixed bottom-4 right-4 z-40 w-36 h-28 rounded-xl overflow-hidden border-2 border-green-500/40 bg-zinc-950 shadow-2xl">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-1 left-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-green-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      )}

      {/* POST-TEST FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Submit Assessment</h3>
              <p className="text-xs text-zinc-400">
                You are about to finish <strong>{test.title}</strong>. Please provide brief feedback on your experience.
              </p>
            </div>

            {/* Questions Completed Summary */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-zinc-400">Questions Completed:</span>
              <span className="font-bold text-white">
                {Object.keys(solvedMap).length} of {test.questions.length} Solved
              </span>
            </div>

            {/* Rating Stars */}
            <div className="space-y-2 text-center">
              <label className="text-xs font-bold text-zinc-300 block">
                How would you rate this assessment?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 text-zinc-600 hover:text-amber-400 transition"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= feedbackRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Feedback */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block text-center">
                Perceived Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'just_right', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setFeedbackDifficulty(diff)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold capitalize transition ${
                      feedbackDifficulty === diff
                        ? 'bg-green-500 text-black font-extrabold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {diff.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Comments */}
            <div>
              <textarea
                rows={3}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Any comments, feedback or technical notes? (Optional)"
                className="w-full p-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition"
              >
                Back to Test
              </button>

              <button
                type="button"
                disabled={submittingTest}
                onClick={handleFinalSubmit}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold shadow-lg shadow-green-500/20 transition disabled:opacity-50"
              >
                {submittingTest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Submit & Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
