'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProctoringConfig {
  requireCamera: boolean;
  requireMic: boolean;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
  requireFullScreen: boolean;
  disableCopyPaste: boolean;
}

interface TestInfo {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  questionCount: number;
  proctoring: ProctoringConfig;
  validUntil?: string;
}

interface CompanyInfo {
  name: string;
  logo: string;
  website?: string;
  description?: string;
}

type Stage = 'loading' | 'info' | 'register' | 'precheck' | 'ready' | 'error';

export default function TestLandingPage() {
  const params = useParams();
  const router = useRouter();
  const link = params?.link as string;

  const [stage, setStage] = useState<Stage>('loading');
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Registration form
  const [candidate, setCandidate] = useState({ name: '', email: '', rollNumber: '', phone: '' });
  const [registering, setRegistering] = useState(false);
  const [attemptId, setAttemptId] = useState('');

  // Pre-check state
  const [checks, setChecks] = useState({
    camera: false,
    mic: false,
    fullscreen: false,
    ready: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!link) return;
    fetch(`/api/test/${link}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStage('error');
          return;
        }
        setTestInfo(data.test);
        setCompanyInfo(data.company);
        setStage('info');
      })
      .catch(() => {
        setErrorMsg('Failed to load test. Please check your link.');
        setStage('error');
      });
  }, [link]);

  const handleRegister = async () => {
    if (!candidate.name.trim() || !candidate.email.trim()) return;
    setRegistering(true);

    try {
      const res = await fetch(`/api/test/${link}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error);
        setStage('error');
        return;
      }

      setAttemptId(data.attemptId);
      setStage('precheck');
    } catch {
      setErrorMsg('Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const startCameraCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: Boolean(testInfo?.proctoring.requireCamera),
        audio: Boolean(testInfo?.proctoring.requireMic),
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setChecks((c) => ({
        ...c,
        camera: Boolean(testInfo?.proctoring.requireCamera),
        mic: Boolean(testInfo?.proctoring.requireMic),
      }));
    } catch {
      alert('Please allow camera/mic access and try again.');
    }
  };

  const startFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setChecks((c) => ({ ...c, fullscreen: true }));
    } catch {
      alert('Please allow fullscreen mode.');
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
    // TODO: redirect to actual test environment
    router.push(`/test/${link}/attempt/${attemptId}`);
  };

  if (stage === 'loading') {
    return (
      <div className="landing-page center">
        <div className="spinner-large" />
        <p className="loading-text">Loading your assessment…</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="landing-page center">
        <div className="error-card">
          <div className="error-icon">❌</div>
          <h2 className="error-title">Test Unavailable</h2>
          <p className="error-msg">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (stage === 'info') {
    return (
      <div className="landing-page">
        <div className="landing-blob blob-1" />
        <div className="landing-blob blob-2" />

        <div className="landing-card">
          {/* Company Header */}
          <div className="company-header">
            {companyInfo?.logo ? (
              <img src={companyInfo.logo} alt={companyInfo.name} className="company-logo" />
            ) : (
              <div className="company-logo-placeholder">
                {companyInfo?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="company-name">{companyInfo?.name}</h2>
              {companyInfo?.website && (
                <a href={companyInfo.website} className="company-web" target="_blank" rel="noreferrer">
                  🌐 {companyInfo.website}
                </a>
              )}
            </div>
          </div>

          {companyInfo?.description && (
            <p className="company-desc">{companyInfo.description}</p>
          )}

          <div className="divider" />

          {/* Test Info */}
          <h1 className="test-title">{testInfo?.title}</h1>

          {testInfo?.description && (
            <p className="test-desc">{testInfo.description}</p>
          )}

          <div className="test-meta-chips">
            <div className="chip">
              <span>⏱️</span>
              <span>{testInfo?.durationMinutes} minutes</span>
            </div>
            <div className="chip">
              <span>📋</span>
              <span>{testInfo?.questionCount} questions</span>
            </div>
            {testInfo?.validUntil && (
              <div className="chip chip-warn">
                <span>📅</span>
                <span>Expires {new Date(testInfo.validUntil).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Proctoring Notice */}
          {testInfo && Object.values(testInfo.proctoring).some((v) => typeof v === 'boolean' && v) && (
            <div className="proctor-notice">
              <div className="proctor-notice-title">
                🔒 This test has proctoring enabled
              </div>
              <div className="proctor-tags">
                {testInfo.proctoring.requireCamera && <span className="ptag">📷 Camera</span>}
                {testInfo.proctoring.requireMic && <span className="ptag">🎤 Microphone</span>}
                {testInfo.proctoring.requireFullScreen && <span className="ptag">⛶ Full Screen</span>}
                {testInfo.proctoring.preventTabSwitch && <span className="ptag">🚫 Tab Watch</span>}
                {testInfo.proctoring.disableCopyPaste && <span className="ptag">📋 No External Paste</span>}
              </div>
            </div>
          )}

          {/* Instructions */}
          {testInfo?.instructions && (
            <div className="instructions-box">
              <h3 className="instr-title">📄 Instructions</h3>
              <div className="instr-content">
                {testInfo.instructions.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          <button className="start-btn" onClick={() => setStage('register')}>
            Proceed to Registration →
          </button>
        </div>

        <style jsx>{`
          .landing-page {
            min-height: 100vh;
            background: #080810;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 40px 20px;
            font-family: 'Inter', -apple-system, sans-serif;
            position: relative;
            overflow-x: hidden;
          }

          .landing-page.center {
            align-items: center;
          }

          .landing-blob {
            position: fixed;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.1;
            pointer-events: none;
          }

          .blob-1 {
            width: 600px; height: 600px;
            background: radial-gradient(circle, #6C63FF, transparent);
            top: -200px; left: -200px;
            animation: blobFloat 12s ease-in-out infinite;
          }

          .blob-2 {
            width: 400px; height: 400px;
            background: radial-gradient(circle, #3ECFCF, transparent);
            bottom: -100px; right: -100px;
            animation: blobFloat 9s ease-in-out infinite reverse;
          }

          @keyframes blobFloat {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, -30px); }
          }

          .landing-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            padding: 40px;
            width: 100%;
            max-width: 680px;
            position: relative;
            z-index: 10;
            backdrop-filter: blur(20px);
            animation: cardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          @keyframes cardIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .company-header {
            display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
          }

          .company-logo {
            width: 60px; height: 60px; border-radius: 14px; object-fit: cover;
          }

          .company-logo-placeholder {
            width: 60px; height: 60px; border-radius: 14px;
            background: linear-gradient(135deg, #6C63FF, #3ECFCF);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; font-weight: 700; color: white;
          }

          .company-name {
            font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 4px;
          }

          .company-web {
            font-size: 13px; color: rgba(108,99,255,0.7); text-decoration: none;
          }

          .company-desc {
            font-size: 14px; color: rgba(255,255,255,0.45); margin: 0 0 16px; line-height: 1.6;
          }

          .divider {
            height: 1px; background: rgba(255,255,255,0.08); margin: 20px 0;
          }

          .test-title {
            font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 10px;
            letter-spacing: -0.5px;
          }

          .test-desc {
            font-size: 14px; color: rgba(255,255,255,0.5); margin: 0 0 20px; line-height: 1.6;
          }

          .test-meta-chips {
            display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;
          }

          .chip {
            display: flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 20px;
            background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
            font-size: 13px; color: rgba(255,255,255,0.7);
          }

          .chip.chip-warn {
            background: rgba(255,179,71,0.1); border-color: rgba(255,179,71,0.25);
            color: #FFB347;
          }

          .proctor-notice {
            background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2);
            border-radius: 14px; padding: 16px 20px; margin-bottom: 20px;
          }

          .proctor-notice-title {
            font-size: 14px; font-weight: 600; color: #a09cff; margin-bottom: 10px;
          }

          .proctor-tags { display: flex; gap: 8px; flex-wrap: wrap; }

          .ptag {
            padding: 4px 10px; border-radius: 20px;
            background: rgba(108,99,255,0.15); color: #a09cff;
            font-size: 12px; font-weight: 500;
          }

          .instructions-box {
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
            border-radius: 14px; padding: 20px; margin-bottom: 24px;
          }

          .instr-title {
            font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.65);
            margin: 0 0 14px;
          }

          .instr-content p {
            font-size: 14px; color: rgba(255,255,255,0.55); margin: 0 0 8px; line-height: 1.6;
          }

          .start-btn {
            width: 100%; padding: 14px;
            background: linear-gradient(135deg, #6C63FF, #3ECFCF);
            border: none; border-radius: 12px; color: white;
            font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s;
          }

          .start-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(108,99,255,0.4); }

          /* Error card */
          .error-card {
            text-align: center; padding: 40px 32px;
            background: rgba(255,77,79,0.08); border: 1px solid rgba(255,77,79,0.2);
            border-radius: 20px; max-width: 400px;
          }

          .error-icon { font-size: 48px; margin-bottom: 16px; }

          .error-title { font-size: 22px; font-weight: 700; color: #ff7875; margin: 0 0 10px; font-family: 'Inter', sans-serif; }
          .error-msg { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; font-family: 'Inter', sans-serif; }

          /* Spinner */
          .spinner-large {
            width: 48px; height: 48px;
            border: 3px solid rgba(108,99,255,0.2);
            border-top-color: #6C63FF; border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin { to { transform: rotate(360deg); } }

          .loading-text { color: rgba(255,255,255,0.4); font-size: 14px; margin: 16px 0 0; font-family: 'Inter', sans-serif; }
        `}</style>
      </div>
    );
  }

  if (stage === 'register') {
    return (
      <div className="landing-page register-page">
        <div className="landing-card register-card">
          <div className="reg-header">
            <button className="back-btn" onClick={() => setStage('info')}>← Back</button>
            <h2 className="reg-title">Candidate Registration</h2>
            <p className="reg-sub">{testInfo?.title}</p>
          </div>

          <div className="reg-form">
            <div className="reg-group">
              <label className="reg-label">Full Name <span className="req-star">*</span></label>
              <input
                className="reg-input"
                type="text"
                placeholder="John Doe"
                value={candidate.name}
                onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
              />
            </div>
            <div className="reg-group">
              <label className="reg-label">Email Address <span className="req-star">*</span></label>
              <input
                className="reg-input"
                type="email"
                placeholder="john@example.com"
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
              />
            </div>
            <div className="reg-row">
              <div className="reg-group">
                <label className="reg-label">Roll / Student ID</label>
                <input
                  className="reg-input"
                  type="text"
                  placeholder="Optional"
                  value={candidate.rollNumber}
                  onChange={(e) => setCandidate({ ...candidate, rollNumber: e.target.value })}
                />
              </div>
              <div className="reg-group">
                <label className="reg-label">Phone</label>
                <input
                  className="reg-input"
                  type="tel"
                  placeholder="Optional"
                  value={candidate.phone}
                  onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })}
                />
              </div>
            </div>

            <button
              className="proceed-btn"
              disabled={!candidate.name.trim() || !candidate.email.trim() || registering}
              onClick={handleRegister}
            >
              {registering ? 'Registering…' : 'Proceed to Pre-Check →'}
            </button>
          </div>
        </div>

        <style jsx>{`
          .register-page {
            min-height: 100vh; background: #080810;
            display: flex; align-items: center; justify-content: center;
            padding: 40px 20px; font-family: 'Inter', -apple-system, sans-serif;
          }

          .register-card {
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px; padding: 40px; width: 100%; max-width: 500px;
            backdrop-filter: blur(20px);
          }

          .reg-header { margin-bottom: 28px; }

          .back-btn {
            background: none; border: none; color: rgba(255,255,255,0.4);
            font-size: 13px; cursor: pointer; padding: 0; margin-bottom: 12px;
            display: block; transition: color 0.15s; font-family: inherit;
          }

          .back-btn:hover { color: rgba(255,255,255,0.7); }

          .reg-title {
            font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 6px;
          }

          .reg-sub {
            font-size: 13px; color: rgba(255,255,255,0.35); margin: 0;
          }

          .reg-form { display: flex; flex-direction: column; gap: 16px; }

          .reg-group { display: flex; flex-direction: column; gap: 6px; }

          .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

          .reg-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.55); }
          .req-star { color: #ff7875; }

          .reg-input {
            background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px; padding: 11px 14px; color: #ffffff;
            font-size: 14px; outline: none; transition: all 0.2s; font-family: inherit;
          }

          .reg-input:focus {
            border-color: rgba(108,99,255,0.6); background: rgba(108,99,255,0.08);
            box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
          }

          .reg-input::placeholder { color: rgba(255,255,255,0.25); }

          .proceed-btn {
            width: 100%; padding: 13px;
            background: linear-gradient(135deg, #6C63FF, #3ECFCF);
            border: none; border-radius: 12px; color: white;
            font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            margin-top: 6px; font-family: inherit;
          }

          .proceed-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(108,99,255,0.4); }
          .proceed-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </div>
    );
  }

  if (stage === 'precheck') {
    const p = testInfo!.proctoring;
    const needsCamera = p.requireCamera || p.requireMic;
    const needsFullscreen = p.requireFullScreen;
    const allOk = allChecksPassed();
    const hasAnyRequirement = needsCamera || needsFullscreen;

    return (
      <div className="precheck-page">
        <div className="precheck-card">
          <h2 className="precheck-title">🔒 System Pre-Check</h2>
          <p className="precheck-sub">
            Please complete all checks before starting <strong>{testInfo?.title}</strong>
          </p>

          {!hasAnyRequirement && (
            <div className="no-checks-notice">
              ✅ No special requirements for this test.
            </div>
          )}

          {/* Camera Check */}
          {needsCamera && (
            <div className={`check-item ${checks.camera ? 'passed' : ''}`}>
              <div className="check-icon">{checks.camera ? '✅' : '📷'}</div>
              <div className="check-content">
                <h4 className="check-title">{p.requireCamera ? 'Camera' : ''}{p.requireCamera && p.requireMic ? ' & ' : ''}{p.requireMic ? 'Microphone' : ''} Access</h4>
                <p className="check-desc">Allow browser access to your {p.requireCamera ? 'camera' : ''}{p.requireCamera && p.requireMic ? ' and ' : ''}{p.requireMic ? 'microphone' : ''}.</p>
                {!checks.camera && (
                  <button className="check-btn" onClick={startCameraCheck}>
                    Enable Access
                  </button>
                )}
                {checks.camera && (
                  <video ref={videoRef} autoPlay muted playsInline className="camera-preview" />
                )}
              </div>
            </div>
          )}

          {/* Fullscreen Check */}
          {needsFullscreen && (
            <div className={`check-item ${checks.fullscreen ? 'passed' : ''}`}>
              <div className="check-icon">{checks.fullscreen ? '✅' : '⛶'}</div>
              <div className="check-content">
                <h4 className="check-title">Full Screen Mode</h4>
                <p className="check-desc">Enter full-screen mode. Exiting will be flagged as a violation.</p>
                {!checks.fullscreen && (
                  <button className="check-btn" onClick={startFullscreen}>Enter Full Screen</button>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className={`precheck-summary ${allOk || !hasAnyRequirement ? 'ok' : 'pending'}`}>
            {allOk || !hasAnyRequirement
              ? '✅ All checks passed! You may start the test.'
              : '⏳ Complete all checks above before proceeding.'}
          </div>

          <button
            className="start-test-btn"
            disabled={hasAnyRequirement && !allOk}
            onClick={handleStartTest}
          >
            🚀 Start Test Now
          </button>
        </div>

        <style jsx>{`
          .precheck-page {
            min-height: 100vh; background: #080810;
            display: flex; align-items: center; justify-content: center;
            padding: 40px 20px; font-family: 'Inter', -apple-system, sans-serif;
          }

          .precheck-card {
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px; padding: 40px; width: 100%; max-width: 560px;
            backdrop-filter: blur(20px);
          }

          .precheck-title {
            font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 8px;
          }

          .precheck-sub {
            font-size: 14px; color: rgba(255,255,255,0.4); margin: 0 0 28px; line-height: 1.5;
          }

          .precheck-sub strong { color: rgba(255,255,255,0.7); }

          .no-checks-notice {
            background: rgba(62,207,207,0.1); border: 1px solid rgba(62,207,207,0.25);
            border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #3ECFCF;
            margin-bottom: 20px;
          }

          .check-item {
            display: flex; gap: 16px; padding: 20px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
            border-radius: 14px; margin-bottom: 12px; transition: all 0.2s;
          }

          .check-item.passed {
            background: rgba(62,207,207,0.06); border-color: rgba(62,207,207,0.2);
          }

          .check-icon { font-size: 28px; flex-shrink: 0; }
          .check-content { flex: 1; }
          .check-title { font-size: 15px; font-weight: 600; color: #ffffff; margin: 0 0 5px; }
          .check-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 12px; }

          .check-btn {
            padding: 8px 16px;
            background: rgba(108,99,255,0.2); border: 1px solid rgba(108,99,255,0.35);
            border-radius: 8px; color: #a09cff; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.15s; font-family: inherit;
          }

          .check-btn:hover { background: rgba(108,99,255,0.3); }

          .camera-preview {
            width: 160px; height: 110px; border-radius: 8px; object-fit: cover;
            border: 2px solid rgba(62,207,207,0.3); margin-top: 8px;
          }

          .precheck-summary {
            padding: 12px 16px; border-radius: 10px;
            font-size: 13px; font-weight: 600; margin: 20px 0 16px; text-align: center;
          }

          .precheck-summary.ok {
            background: rgba(62,207,207,0.1); border: 1px solid rgba(62,207,207,0.25);
            color: #3ECFCF;
          }

          .precheck-summary.pending {
            background: rgba(255,179,71,0.1); border: 1px solid rgba(255,179,71,0.25);
            color: #FFB347;
          }

          .start-test-btn {
            width: 100%; padding: 14px;
            background: linear-gradient(135deg, #6C63FF, #3ECFCF);
            border: none; border-radius: 12px; color: white;
            font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s;
            font-family: inherit;
          }

          .start-test-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(108,99,255,0.4); }
          .start-test-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>
      </div>
    );
  }

  return null;
}
