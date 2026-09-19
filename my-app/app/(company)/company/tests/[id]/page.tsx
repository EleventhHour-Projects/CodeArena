'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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

const DIFF_COLORS: Record<string, string> = {
  easy: '#4ade80',
  medium: '#fb923c',
  hard: '#f87171',
};

export default function TestFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<TestForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'proctoring' | 'settings'>('basic');

  // New question state
  const [newQ, setNewQ] = useState<TestQuestion>({ problemId: 0, title: '', difficulty: 'medium', points: 10 });
  const [generatedLink, setGeneratedLink] = useState('');

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
        });
    }
  }, [id, isNew]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

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
        setError(data.error || 'Failed to save test');
      } else {
        setSuccess(isNew ? 'Test created successfully!' : 'Test updated successfully!');
        if (isNew && data.test?._id) {
          router.push(`/company/tests/${data.test._id}`);
        }
        setGeneratedLink(data.test?.testLink || generatedLink);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (!newQ.title.trim() || !newQ.problemId) {
      setError('Please fill in the question title and problem ID');
      return;
    }
    setForm((f) => ({ ...f, questions: [...f.questions, { ...newQ }] }));
    setNewQ({ problemId: 0, title: '', difficulty: 'medium', points: 10 });
    setError('');
  };

  const removeQuestion = (index: number) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
  };

  const updateProctoring = (key: keyof ProctoringConfig, value: boolean | number) => {
    setForm((f) => ({ ...f, proctoring: { ...f.proctoring, [key]: value } }));
  };

  const copyTestLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(`${window.location.origin}/test/${generatedLink}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <p>Loading test…</p>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'questions', label: `Questions (${form.questions.length})`, icon: '❓' },
    { id: 'proctoring', label: 'Proctoring', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  return (
    <div className="test-form-page">
      <div className="page-header">
        <div className="header-left">
          <Link href="/company/tests" className="back-link">
            ← Back to Tests
          </Link>
          <h1 className="page-title">{isNew ? 'Create New Test' : 'Edit Test'}</h1>
        </div>

        {!isNew && generatedLink && (
          <div className="link-box">
            <span className="link-label">Test Link:</span>
            <code className="link-code">/test/{generatedLink.slice(0, 8)}…</code>
            <button className="copy-link-btn" onClick={copyTestLink}>
              📋 Copy Link
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && <div className="alert success">✅ {success}</div>}
      {error && <div className="alert error">❌ {error}</div>}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="test-form">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">Test Title <span className="req">*</span></label>
              <input
                className="form-input"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Backend Developer Assessment Q4 2024"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of what this test covers..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instructions for Candidates</label>
              <textarea
                className="form-textarea"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Detailed instructions shown to candidates before they start the test. Include rules, expectations, and any important notes..."
                rows={6}
              />
              <span className="form-hint">Markdown is supported. Candidates see this on the test landing page.</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration (minutes) <span className="req">*</span></label>
                <input
                  className="form-input"
                  type="number"
                  min={5}
                  max={480}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active (accessible by link)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="form-section">
            <div className="questions-intro">
              <p>Add coding problems from CodeArena's problem bank. Enter the Problem ID and details.</p>
            </div>

            {/* Add Question Form */}
            <div className="add-question-form">
              <h3 className="sub-section-title">Add Question</h3>
              <div className="question-form-grid">
                <div className="form-group">
                  <label className="form-label">Problem ID</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={newQ.problemId || ''}
                    onChange={(e) => setNewQ({ ...newQ, problemId: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 101"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Title</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newQ.title}
                    onChange={(e) => setNewQ({ ...newQ, title: e.target.value })}
                    placeholder="Two Sum"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={newQ.difficulty}
                    onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value as any })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Points</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={newQ.points}
                    onChange={(e) => setNewQ({ ...newQ, points: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>

              <button type="button" className="add-q-btn" onClick={addQuestion}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Question
              </button>
            </div>

            {/* Questions List */}
            {form.questions.length > 0 ? (
              <div className="questions-list">
                <div className="questions-list-header">
                  <span>Question</span>
                  <span>Difficulty</span>
                  <span>Points</span>
                  <span></span>
                </div>
                {form.questions.map((q, i) => (
                  <div key={i} className="question-row">
                    <div className="q-info">
                      <span className="q-num">#{q.problemId}</span>
                      <span className="q-title">{q.title}</span>
                    </div>
                    <span className="q-diff" style={{ color: DIFF_COLORS[q.difficulty] }}>
                      {q.difficulty}
                    </span>
                    <span className="q-points">{q.points} pts</span>
                    <button type="button" className="remove-q-btn" onClick={() => removeQuestion(i)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="questions-total">
                  Total: <strong>{form.questions.reduce((s, q) => s + q.points, 0)} points</strong> across {form.questions.length} questions
                </div>
              </div>
            ) : (
              <div className="no-questions">
                <span>❓</span>
                <p>No questions added yet. Add your first question above.</p>
              </div>
            )}
          </div>
        )}

        {/* Proctoring Tab */}
        {activeTab === 'proctoring' && (
          <div className="form-section">
            <div className="proctoring-intro">
              <div className="intro-icon">🔒</div>
              <div>
                <h3 className="intro-title">Proctoring Settings</h3>
                <p className="intro-text">
                  Configure security measures for your assessment. Candidates must satisfy all enabled requirements before the test begins.
                </p>
              </div>
            </div>

            <div className="proctor-cards">
              <div className={`proctor-card ${form.proctoring.requireCamera ? 'enabled' : ''}`}>
                <div className="proctor-card-icon">📷</div>
                <div className="proctor-card-content">
                  <h4 className="proctor-card-title">Camera Required</h4>
                  <p className="proctor-card-desc">Candidate must enable their webcam. Camera feed is monitored during the test.</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.proctoring.requireCamera}
                    onChange={(e) => updateProctoring('requireCamera', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className={`proctor-card ${form.proctoring.requireMic ? 'enabled' : ''}`}>
                <div className="proctor-card-icon">🎤</div>
                <div className="proctor-card-content">
                  <h4 className="proctor-card-title">Microphone Required</h4>
                  <p className="proctor-card-desc">Candidate must enable their microphone for audio monitoring.</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.proctoring.requireMic}
                    onChange={(e) => updateProctoring('requireMic', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className={`proctor-card ${form.proctoring.requireFullScreen ? 'enabled' : ''}`}>
                <div className="proctor-card-icon">⛶</div>
                <div className="proctor-card-content">
                  <h4 className="proctor-card-title">Full Screen Required</h4>
                  <p className="proctor-card-desc">Candidate must enter full-screen mode. Exiting full screen is flagged as a violation.</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.proctoring.requireFullScreen}
                    onChange={(e) => updateProctoring('requireFullScreen', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className={`proctor-card ${form.proctoring.preventTabSwitch ? 'enabled' : ''}`}>
                <div className="proctor-card-icon">🚫</div>
                <div className="proctor-card-content">
                  <h4 className="proctor-card-title">Prevent Tab Switching</h4>
                  <p className="proctor-card-desc">Tab switches are detected and logged. Candidate can be auto-terminated after max violations.</p>
                  {form.proctoring.preventTabSwitch && (
                    <div className="sub-setting">
                      <label className="form-label">Max tab switches before termination</label>
                      <input
                        className="form-input small"
                        type="number"
                        min={1}
                        max={20}
                        value={form.proctoring.maxTabSwitches}
                        onChange={(e) => updateProctoring('maxTabSwitches', parseInt(e.target.value) || 3)}
                      />
                    </div>
                  )}
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.proctoring.preventTabSwitch}
                    onChange={(e) => updateProctoring('preventTabSwitch', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className={`proctor-card ${form.proctoring.disableCopyPaste ? 'enabled' : ''}`}>
                <div className="proctor-card-icon">📋</div>
                <div className="proctor-card-content">
                  <h4 className="proctor-card-title">Disable Copy-Paste</h4>
                  <p className="proctor-card-desc">External copy-paste is disabled. Candidates cannot paste code from outside the editor.</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.proctoring.disableCopyPaste}
                    onChange={(e) => updateProctoring('disableCopyPaste', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="proctor-summary">
              <span className="summary-label">Active measures:</span>
              {Object.entries(form.proctoring)
                .filter(([k, v]) => typeof v === 'boolean' && v)
                .map(([k]) => (
                  <span key={k} className="summary-tag">
                    {k === 'requireCamera' ? '📷 Camera' :
                     k === 'requireMic' ? '🎤 Mic' :
                     k === 'requireFullScreen' ? '⛶ Full Screen' :
                     k === 'preventTabSwitch' ? '🚫 Tab Watch' :
                     k === 'disableCopyPaste' ? '📋 No Paste' : k}
                  </span>
                ))}
              {!Object.values(form.proctoring).some((v) => typeof v === 'boolean' && v) && (
                <span className="summary-none">None — test is fully open</span>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="form-section">
            <h3 className="sub-section-title">Test Validity Window</h3>
            <p className="settings-desc">
              Control when candidates can access this test link. Leave empty for no restriction.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Valid From</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valid Until</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
            </div>

            {!isNew && generatedLink && (
              <div className="link-preview">
                <h3 className="sub-section-title">Shareable Test Link</h3>
                <div className="link-display">
                  <code className="full-link">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/test/{generatedLink}
                  </code>
                  <button type="button" className="copy-link-btn" onClick={copyTestLink}>
                    📋 Copy
                  </button>
                </div>
                <p className="link-note">Share this link with candidates. They'll see your company info before starting.</p>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="form-footer">
          <Link href="/company/tests" className="cancel-btn">Cancel</Link>
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? (
              <><span className="btn-spinner" /> Saving…</>
            ) : (
              <>{isNew ? '🚀 Create Test' : '💾 Save Changes'}</>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .test-form-page { padding: 32px; max-width: 900px; }

        .loading-page {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 60vh; gap: 14px;
          color: rgba(255,255,255,0.4);
        }

        .loading-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(108,99,255,0.2);
          border-top-color: #22c55e; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
        }

        .header-left { display: flex; flex-direction: column; gap: 6px; }

        .back-link {
          font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none;
          transition: color 0.15s;
        }

        .back-link:hover { color: rgba(255,255,255,0.7); }

        .page-title { font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.5px; }

        .link-box {
          display: flex; align-items: center; gap: 8px;
          background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.2);
          border-radius: 10px; padding: 8px 12px;
        }

        .link-label { font-size: 12px; color: rgba(255,255,255,0.45); }
        .link-code { font-size: 12px; color: #a09cff; font-family: monospace; }

        .copy-link-btn {
          background: rgba(108,99,255,0.15); border: none; border-radius: 6px;
          color: #a09cff; font-size: 12px; padding: 4px 10px; cursor: pointer;
          transition: all 0.15s;
        }

        .copy-link-btn:hover { background: rgba(108,99,255,0.25); }

        .alert {
          padding: 12px 16px; border-radius: 10px; font-size: 13px;
          font-weight: 500; margin-bottom: 16px;
        }

        .alert.success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #4ade80; }
        .alert.error { background: rgba(255,77,79,0.1); border: 1px solid rgba(255,77,79,0.25); color: #ff7875; }

        .tabs {
          display: flex; gap: 2px; margin-bottom: 24px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 4px; width: fit-content;
        }

        .tab {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 8px;
          background: transparent; border: none; color: rgba(255,255,255,0.45);
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.18s;
        }

        .tab:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }
        .tab.active { background: rgba(108,99,255,0.2); color: #a09cff; }

        .test-form {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }

        .form-section { padding: 28px; display: flex; flex-direction: column; gap: 20px; }

        .form-group { display: flex; flex-direction: column; gap: 7px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }

        .form-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); }
        .req { color: #ff7875; }
        .form-hint { font-size: 11px; color: rgba(255,255,255,0.3); }

        .form-input, .form-textarea, .form-select {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 11px 14px; color: #ffffff;
          font-size: 14px; outline: none; transition: all 0.2s; font-family: inherit;
          resize: vertical;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: rgba(108,99,255,0.6); background: rgba(108,99,255,0.08);
          box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
        }

        .form-input::placeholder, .form-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .form-input.small { max-width: 120px; }

        /* Questions */
        .questions-intro { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.15); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,0.55); }

        .add-question-form {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
        }

        .sub-section-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.65); margin: 0; }

        .question-form-grid { display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; gap: 12px; }
        @media (max-width: 700px) { .question-form-grid { grid-template-columns: 1fr 1fr; } }

        .add-q-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; background: rgba(108,99,255,0.2);
          border: 1px solid rgba(108,99,255,0.35); border-radius: 8px;
          color: #a09cff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; width: fit-content;
        }

        .add-q-btn:hover { background: rgba(108,99,255,0.3); }

        .questions-list {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden;
        }

        .questions-list-header {
          display: grid; grid-template-columns: 1fr 100px 80px 40px;
          padding: 10px 16px; background: rgba(255,255,255,0.04);
          font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
        }

        .question-row {
          display: grid; grid-template-columns: 1fr 100px 80px 40px;
          padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05);
          align-items: center;
        }

        .q-info { display: flex; align-items: center; gap: 8px; }
        .q-num { font-size: 12px; color: rgba(255,255,255,0.3); font-family: monospace; }
        .q-title { font-size: 14px; color: #ffffff; font-weight: 500; }
        .q-diff { font-size: 12px; font-weight: 600; text-transform: capitalize; }
        .q-points { font-size: 13px; color: rgba(255,255,255,0.6); }

        .remove-q-btn {
          width: 28px; height: 28px; border-radius: 6px;
          background: rgba(255,77,79,0.1); border: none; color: #ff7875;
          cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }

        .remove-q-btn:hover { background: rgba(255,77,79,0.2); }

        .questions-total {
          padding: 10px 16px; font-size: 12px; color: rgba(255,255,255,0.4);
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }

        .questions-total strong { color: rgba(255,255,255,0.7); }

        .no-questions {
          display: flex; flex-direction: column; align-items: center;
          padding: 32px; gap: 10px; color: rgba(255,255,255,0.35);
          border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;
          font-size: 13px; font-size: 32px;
        }

        .no-questions span { font-size: 32px; }
        .no-questions p { margin: 0; font-size: 13px; }

        /* Proctoring */
        .proctoring-intro {
          display: flex; gap: 16px; align-items: flex-start;
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.15);
          border-radius: 14px; padding: 16px 20px;
        }

        .intro-icon { font-size: 32px; flex-shrink: 0; }
        .intro-title { font-size: 16px; font-weight: 600; color: #ffffff; margin: 0 0 6px; }
        .intro-text { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; }

        .proctor-cards { display: flex; flex-direction: column; gap: 12px; }

        .proctor-card {
          display: flex; align-items: center; gap: 16px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 16px 20px; transition: all 0.2s;
        }

        .proctor-card.enabled {
          background: rgba(108,99,255,0.08); border-color: rgba(108,99,255,0.25);
        }

        .proctor-card-icon { font-size: 24px; flex-shrink: 0; }
        .proctor-card-content { flex: 1; min-width: 0; }
        .proctor-card-title { font-size: 14px; font-weight: 600; color: #ffffff; margin: 0 0 4px; }
        .proctor-card-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.5; }

        .sub-setting { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }

        /* Toggle switch */
        .toggle {
          position: relative; display: inline-block;
          width: 44px; height: 24px; flex-shrink: 0; cursor: pointer;
        }

        .toggle input { opacity: 0; width: 0; height: 0; }

        .toggle-slider {
          position: absolute; inset: 0; background: rgba(255,255,255,0.12);
          border-radius: 24px; transition: 0.2s;
        }

        .toggle-slider::before {
          content: ''; position: absolute;
          width: 18px; height: 18px; left: 3px; top: 3px;
          background: white; border-radius: 50%; transition: 0.2s;
        }

        .toggle input:checked + .toggle-slider { background: #22c55e; }
        .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

        .proctor-summary {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 12px 16px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07); border-radius: 10px;
        }

        .summary-label { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 600; }

        .summary-tag {
          padding: 3px 10px; border-radius: 20px;
          background: rgba(108,99,255,0.15); color: #a09cff;
          font-size: 12px; font-weight: 500;
        }

        .summary-none { font-size: 12px; color: rgba(255,255,255,0.3); font-style: italic; }

        /* Settings tab */
        .settings-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }

        .link-preview { display: flex; flex-direction: column; gap: 12px; }

        .link-display {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 12px 16px;
        }

        .full-link {
          font-family: monospace; font-size: 13px; color: #a09cff;
          flex: 1; word-break: break-all;
        }

        .link-note { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; }

        /* Footer */
        .form-footer {
          display: flex; align-items: center; justify-content: flex-end; gap: 12px;
          padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }

        .cancel-btn {
          padding: 10px 20px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500;
          text-decoration: none; transition: all 0.15s;
        }

        .cancel-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }

        .submit-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 24px;
          background: #22c55e;
          color: #050505;
          border: none; border-radius: 10px; color: white;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(108,99,255,0.4); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
      `}</style>
    </div>
  );
}
