'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TestItem {
  _id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  durationMinutes: number;
  questions: any[];
  createdAt: string;
  testLink: string;
  validFrom?: string;
  validUntil?: string;
  proctoring: {
    requireCamera: boolean;
    requireMic: boolean;
    preventTabSwitch: boolean;
    requireFullScreen: boolean;
    disableCopyPaste: boolean;
  };
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function TestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    const res = await fetch('/api/company/tests');
    const data = await res.json();
    if (data.tests) setTests(data.tests);
    setLoading(false);
  };

  const handleCopyLink = (link: string) => {
    const url = `${window.location.origin}/test/${link}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(link);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    setDeleting(id);
    await fetch(`/api/company/tests/${id}`, { method: 'DELETE' });
    setTests((prev) => prev.filter((t) => t._id !== id));
    setDeleting(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/company/tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTests((prev) => prev.map((t) => (t._id === id ? { ...t, status: status as any } : t)));
  };

  const filtered = filter === 'all' ? tests : tests.filter((t) => t.status === filter);

  const getProctoringIcons = (p: TestItem['proctoring']) => {
    const icons: string[] = [];
    if (p.requireCamera) icons.push('📷');
    if (p.requireMic) icons.push('🎤');
    if (p.preventTabSwitch) icons.push('🚫');
    if (p.requireFullScreen) icons.push('⛶');
    if (p.disableCopyPaste) icons.push('📋');
    return icons;
  };

  return (
    <div className="tests-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tests & Assessments</h1>
          <p className="page-subtitle">Create and manage your coding assessments</p>
        </div>
        <Link href="/company/tests/new" className="create-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Test
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'active', 'draft', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="tab-count">
              {tab === 'all' ? tests.length : tests.filter((t) => t.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading tests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No {filter === 'all' ? '' : filter} tests yet</h3>
          <p>Create your first assessment to get started</p>
          <Link href="/company/tests/new" className="create-btn">Create Test</Link>
        </div>
      ) : (
        <div className="tests-grid">
          {filtered.map((test) => (
            <div key={test._id} className="test-card">
              <div className="test-card-header">
                <span className={`status-badge ${test.status}`}>{test.status}</span>
                <div className="test-actions">
                  <Link href={`/company/tests/${test._id}`} className="action-btn edit-btn" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Link>
                  <button
                    className="action-btn copy-btn"
                    onClick={() => handleCopyLink(test.testLink)}
                    title="Copy test link"
                  >
                    {copySuccess === test.testLink ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(test._id)}
                    disabled={deleting === test._id}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <h3 className="test-title">{test.title}</h3>

              <div className="test-meta">
                <span className="meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {test.durationMinutes} min
                </span>
                <span className="meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                  {test.questions.length} questions
                </span>
              </div>

              {/* Proctoring Icons */}
              {getProctoringIcons(test.proctoring).length > 0 && (
                <div className="proctoring-icons">
                  {getProctoringIcons(test.proctoring).map((icon, i) => (
                    <span key={i} className="proctor-icon" title="Proctoring enabled">{icon}</span>
                  ))}
                </div>
              )}

              {/* Validity */}
              {(test.validFrom || test.validUntil) && (
                <div className="validity-info">
                  {test.validFrom && (
                    <span>From: {new Date(test.validFrom).toLocaleDateString()}</span>
                  )}
                  {test.validUntil && (
                    <span>Until: {new Date(test.validUntil).toLocaleDateString()}</span>
                  )}
                </div>
              )}

              {/* Status Toggle */}
              <div className="card-footer">
                <select
                  className="status-select"
                  value={test.status}
                  onChange={(e) => handleStatusChange(test._id, e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <span className="test-date">
                  {new Date(test.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .tests-page { padding: 32px; max-width: 1200px; }

        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 24px; gap: 16px;
        }

        .page-title { font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 6px; letter-spacing: -0.5px; }
        .page-subtitle { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }

        .create-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: #22c55e;
          color: #050505;
          border: none; border-radius: 10px; color: white;
          font-size: 14px; font-weight: 600; text-decoration: none;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }

        .create-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(108,99,255,0.4); }

        .filter-tabs {
          display: flex; gap: 4px; margin-bottom: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 4px; width: fit-content;
        }

        .filter-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          background: transparent; border: none; color: rgba(255,255,255,0.45);
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.18s;
        }

        .filter-tab:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }
        .filter-tab.active { background: rgba(108,99,255,0.2); color: #a09cff; }

        .tab-count {
          background: rgba(255,255,255,0.1); border-radius: 20px;
          padding: 2px 7px; font-size: 11px;
        }

        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 40vh; gap: 14px;
          color: rgba(255,255,255,0.4);
        }

        .loading-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(108,99,255,0.2);
          border-top-color: #22c55e; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          padding: 64px 24px; gap: 12px; text-align: center;
        }

        .empty-icon { font-size: 52px; }
        .empty-state h3 { font-size: 20px; font-weight: 600; color: #ffffff; margin: 0; }
        .empty-state p { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }

        .tests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .test-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px;
          transition: all 0.2s; display: flex; flex-direction: column; gap: 12px;
        }

        .test-card:hover { border-color: rgba(108,99,255,0.3); transform: translateY(-2px); }

        .test-card-header {
          display: flex; align-items: center; justify-content: space-between;
        }

        .status-badge {
          padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; text-transform: capitalize;
        }

        .status-badge.active { background: rgba(34,197,94,0.15); color: #4ade80; }
        .status-badge.draft { background: rgba(255,179,71,0.15); color: #FFB347; }
        .status-badge.archived { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }

        .test-actions { display: flex; gap: 4px; }

        .action-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: none; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none;
        }

        .edit-btn { background: rgba(108,99,255,0.1); color: #a09cff; }
        .edit-btn:hover { background: rgba(108,99,255,0.2); }

        .copy-btn { background: rgba(34,197,94,0.1); color: #4ade80; }
        .copy-btn:hover { background: rgba(62,207,207,0.2); }

        .delete-btn { background: rgba(255,77,79,0.08); color: rgba(255,100,100,0.7); }
        .delete-btn:hover { background: rgba(255,77,79,0.15); color: #ff7875; }
        .delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .test-title { font-size: 16px; font-weight: 600; color: #ffffff; margin: 0; }

        .test-meta { display: flex; gap: 12px; }

        .meta-item {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; color: rgba(255,255,255,0.45);
        }

        .proctoring-icons { display: flex; gap: 6px; flex-wrap: wrap; }
        .proctor-icon { font-size: 16px; }

        .validity-info {
          display: flex; gap: 12px; flex-wrap: wrap;
          font-size: 11px; color: rgba(255,255,255,0.35);
        }

        .card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: auto; padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .status-select {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; padding: 5px 8px;
          color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer;
          outline: none;
        }

        .test-date { font-size: 11px; color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
