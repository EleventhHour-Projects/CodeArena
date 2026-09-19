'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Question {
  problemId: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface AttemptPayload {
  attempt: {
    id: string;
    candidate: { name: string; email: string };
    status: 'registered' | 'in_progress' | 'submitted' | 'terminated';
    startedAt?: string;
    tabSwitchCount: number;
  };
  test: {
    title: string;
    instructions?: string;
    durationMinutes: number;
    questions: Question[];
    proctoring: {
      preventTabSwitch: boolean;
      maxTabSwitches: number;
      requireFullScreen: boolean;
      disableCopyPaste: boolean;
    };
  };
}

export default function CandidateAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closed, setClosed] = useState(false);

  const currentQuestion = payload?.test.questions[activeQuestion];
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);

  async function submitTest() {
    if (submitting || closed) return;
    setSubmitting(true);
    const formattedAnswers = Object.entries(answers).map(([problemId, code]) => ({
      problemId: Number(problemId),
      code,
      language: 'text',
      submittedAt: new Date(),
      score: 0,
    }));
    await fetch(`/api/test/attempt/${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', answers: formattedAnswers }),
    });
    setClosed(true);
    setSubmitting(false);
  }

  const recordViolation = async (type: string) => {
    if (!payload?.test.proctoring.preventTabSwitch && type === 'tab_switch') return;
    await fetch(`/api/test/attempt/${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'violation', type }),
    });
  };

  useEffect(() => {
    fetch(`/api/test/attempt/${attemptId}`)
      .then((response) => response.json())
      .then((data: AttemptPayload & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setPayload(data);
        const start = data.attempt.startedAt ? new Date(data.attempt.startedAt).getTime() : Date.now();
        setSecondsLeft(Math.max(0, data.test.durationMinutes * 60 - Math.floor((Date.now() - start) / 1000)));
      })
      .catch(() => router.replace(`/test/${params?.link}`))
      .finally(() => setLoading(false));
  }, [attemptId, params, router]);

  useEffect(() => {
    if (!payload || closed || payload.attempt.status === 'submitted') return;
    const startAttempt = async () => {
      if (payload.attempt.status === 'registered') {
        await fetch(`/api/test/attempt/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });
      }
    };
    startAttempt();
  }, [attemptId, closed, payload]);

  useEffect(() => {
    if (!payload || closed) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval);
          void submitTest();
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [payload, closed]);

  useEffect(() => {
    if (!payload) return;
    const onVisibilityChange = () => {
      if (document.hidden && payload.test.proctoring.preventTabSwitch) void recordViolation('tab_switch');
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && payload.test.proctoring.requireFullScreen) void recordViolation('fullscreen_exit');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [payload]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (loading) return <main className="attempt-shell"><p>Loading assessment…</p></main>;
  if (!payload) return null;
  if (closed) {
    return <main className="attempt-shell"><section className="completion-card"><span className="completion-mark">✓</span><h1>Assessment submitted</h1><p>Your responses were recorded. You may now close this window.</p></section></main>;
  }

  return (
    <main className="attempt-shell">
      <header className="attempt-header">
        <div><p className="eyebrow">Candidate workspace</p><h1>{payload.test.title}</h1><p className="candidate-name">{payload.attempt.candidate.name}</p></div>
        <div className={`timer ${secondsLeft < 300 ? 'urgent' : ''}`} aria-label="Time remaining">{formatTime(secondsLeft)}</div>
      </header>
      <div className="attempt-layout">
        <aside className="question-nav">
          <div className="nav-heading"><span>Questions</span><strong>{answeredCount}/{payload.test.questions.length}</strong></div>
          {payload.test.questions.map((question, index) => (
            <button key={question.problemId} className={`question-pill ${index === activeQuestion ? 'selected' : ''} ${answers[question.problemId] ? 'answered' : ''}`} onClick={() => setActiveQuestion(index)}>
              <span>{index + 1}</span><span>{question.title}</span>
            </button>
          ))}
          <button className="submit-button" onClick={submitTest} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit assessment'}</button>
        </aside>
        <section className="question-panel">
          {currentQuestion && <>
            <div className="question-topline"><span className={`difficulty ${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span><span>{currentQuestion.points} points</span></div>
            <h2>{currentQuestion.title}</h2>
            {payload.test.instructions && <div className="instructions"><strong>Instructions</strong><p>{payload.test.instructions}</p></div>}
            <label className="answer-label" htmlFor="candidate-answer">Your response</label>
            <textarea
              id="candidate-answer"
              value={answers[currentQuestion.problemId] || ''}
              onChange={(event) => setAnswers({ ...answers, [currentQuestion.problemId]: event.target.value })}
              onPaste={(event) => { if (payload.test.proctoring.disableCopyPaste) { event.preventDefault(); void recordViolation('copy_paste'); } }}
              onCopy={(event) => { if (payload.test.proctoring.disableCopyPaste) { event.preventDefault(); void recordViolation('copy_paste'); } }}
              onCut={(event) => { if (payload.test.proctoring.disableCopyPaste) { event.preventDefault(); void recordViolation('copy_paste'); } }}
              placeholder="Write your answer here..."
              spellCheck={false}
              onContextMenu={(event) => payload.test.proctoring.disableCopyPaste && event.preventDefault()}
            />
            <div className="question-footer"><button className="secondary-button" disabled={activeQuestion === 0} onClick={() => setActiveQuestion(activeQuestion - 1)}>Previous</button><button className="primary-button" disabled={activeQuestion === payload.test.questions.length - 1} onClick={() => setActiveQuestion(activeQuestion + 1)}>Next question</button></div>
          </>}
        </section>
      </div>
      <style jsx>{`
        .attempt-shell { min-height: 100vh; background: #09090b; color: #f4f4f5; padding: 28px clamp(16px, 4vw, 52px); font-family: var(--font-geist-sans), sans-serif; }
        .attempt-header { max-width: 1280px; margin: 0 auto 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
        .eyebrow { color: #818cf8; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; margin: 0 0 8px; }.attempt-header h1 { margin: 0; font-size: clamp(22px, 3vw, 34px); }.candidate-name { color: #71717a; margin: 8px 0 0; }
        .timer { font-variant-numeric: tabular-nums; font-size: 28px; font-weight: 700; padding: 10px 16px; border: 1px solid rgba(255,255,255,.08); border-radius: 8px; background: #0c0c0e; }.timer.urgent { color: #fb7185; border-color: rgba(244,63,94,.45); }
        .attempt-layout { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 18px; }.question-nav, .question-panel, .completion-card { background: #0c0c0e; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; }.question-nav { padding: 16px; display: flex; flex-direction: column; gap: 8px; align-self: start; }.nav-heading { display: flex; justify-content: space-between; color: #71717a; font-size: 13px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.08); }.nav-heading strong { color: #f4f4f5; }.question-pill { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #71717a; text-align: left; cursor: pointer; }.question-pill span:first-child { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #18181b; color: #a1a1aa; font-size: 12px; }.question-pill.selected { border-color: rgba(99,102,241,.55); color: #f4f4f5; background: rgba(99,102,241,.1); }.question-pill.answered span:first-child { background: #22c55e; color: #052e16; }.submit-button, .primary-button { background: #6366f1; color: white; border: 0; border-radius: 7px; font-weight: 700; cursor: pointer; }.submit-button { padding: 12px; margin-top: 14px; }.submit-button:disabled { opacity: .6; }.question-panel { padding: clamp(22px, 4vw, 48px); min-height: 560px; }.question-topline { display: flex; justify-content: space-between; color: #71717a; font-size: 13px; }.difficulty { text-transform: capitalize; }.difficulty.easy { color: #4ade80; }.difficulty.medium { color: #fbbf24; }.difficulty.hard { color: #fb7185; }.question-panel h2 { font-size: clamp(22px, 3vw, 32px); margin: 28px 0; max-width: 820px; }.instructions { background: #09090b; border-left: 3px solid #6366f1; padding: 14px 16px; color: #a1a1aa; margin-bottom: 28px; }.instructions p { white-space: pre-wrap; line-height: 1.6; margin: 8px 0 0; }.answer-label { display: block; color: #a1a1aa; font-size: 13px; margin-bottom: 8px; }.question-panel textarea { width: 100%; min-height: 250px; resize: vertical; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 16px; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; outline: none; }.question-panel textarea:focus { border-color: rgba(99,102,241,.7); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }.question-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }.secondary-button, .primary-button { padding: 11px 16px; }.secondary-button { border: 1px solid rgba(255,255,255,.1); background: transparent; color: #f4f4f5; border-radius: 7px; cursor: pointer; }.secondary-button:disabled, .primary-button:disabled { opacity: .45; cursor: not-allowed; }.completion-card { max-width: 560px; margin: 16vh auto; padding: 48px; text-align: center; }.completion-mark { display: grid; place-items: center; width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 50%; background: #22c55e; color: #052e16; font-size: 30px; }.completion-card p { color: #a1a1aa; } @media (max-width: 760px) { .attempt-header { align-items: flex-start; flex-direction: column; }.timer { font-size: 22px; }.attempt-layout { grid-template-columns: 1fr; }.question-nav { order: 2; }.question-panel { min-height: auto; } }
      `}</style>
    </main>
  );
}
