'use client';

import { useEffect, useState, FormEvent } from 'react';

interface CompanyProfile {
  name: string;
  email: string;
  logo: string;
  website: string;
  description: string;
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    email: '',
    logo: '',
    website: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/company/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.company) setProfile(d.company);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          logo: profile.logo,
          website: profile.website,
          description: profile.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
      } else {
        setProfile(data.company);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Company Profile</h1>
        <p className="page-subtitle">Manage your company information shown to candidates</p>
      </div>

      <div className="profile-layout">
        {/* Preview Card */}
        <div className="preview-card">
          <div className="preview-label">Preview</div>
          <div className="preview-company">
            <div className="preview-avatar">
              {profile.logo ? (
                <img src={profile.logo} alt={profile.name} className="preview-logo" />
              ) : (
                <span className="preview-initials">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            <h3 className="preview-name">{profile.name || 'Company Name'}</h3>
            {profile.website && (
              <a href={profile.website} className="preview-website" target="_blank" rel="noreferrer">
                🌐 {profile.website}
              </a>
            )}
            {profile.description && (
              <p className="preview-description">{profile.description}</p>
            )}
          </div>
          <div className="preview-note">
            This is how candidates see your company on the test landing page
          </div>
        </div>

        {/* Edit Form */}
        <form className="edit-form" onSubmit={handleSave}>
          {success && (
            <div className="alert success">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="alert error">
              ❌ {error}
            </div>
          )}

          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>

            <div className="form-group">
              <label className="form-label">Company Name <span className="required">*</span></label>
              <input
                className="form-input"
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input disabled"
                type="email"
                value={profile.email}
                disabled
              />
              <span className="form-hint">Email cannot be changed. Contact admin.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input
                className="form-input"
                type="url"
                value={profile.logo}
                onChange={(e) => setProfile({ ...profile, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <span className="form-hint">Direct URL to your company logo image</span>
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                className="form-input"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourcompany.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Brief description of your company shown to candidates..."
                rows={4}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .profile-page {
          padding: 32px;
          max-width: 1000px;
        }

        .profile-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 60vh; gap: 16px;
          color: rgba(255,255,255,0.4);
        }

        .loading-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(108,99,255,0.2);
          border-top-color: #22c55e;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .page-header { margin-bottom: 32px; }

        .page-title {
          font-size: 26px; font-weight: 700; color: #ffffff;
          margin: 0 0 6px; letter-spacing: -0.5px;
        }

        .page-subtitle {
          font-size: 14px; color: rgba(255,255,255,0.4); margin: 0;
        }

        .profile-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .profile-layout { grid-template-columns: 1fr; }
        }

        .preview-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          position: sticky;
          top: 32px;
        }

        .preview-label {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35);
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;
        }

        .preview-company {
          text-align: center; padding: 16px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 14px;
        }

        .preview-avatar {
          width: 72px; height: 72px; border-radius: 16px;
          background: #22c55e;
          color: #050505;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px; overflow: hidden;
        }

        .preview-logo { width: 100%; height: 100%; object-fit: cover; }

        .preview-initials {
          font-size: 32px; font-weight: 700; color: white;
        }

        .preview-name {
          font-size: 18px; font-weight: 700; color: #ffffff;
          margin: 0 0 8px;
        }

        .preview-website {
          display: block; font-size: 12px;
          color: rgba(108,99,255,0.7); text-decoration: none;
          margin-bottom: 10px;
        }

        .preview-description {
          font-size: 13px; color: rgba(255,255,255,0.45);
          margin: 0; line-height: 1.5;
        }

        .preview-note {
          font-size: 11px; color: rgba(255,255,255,0.25);
          text-align: center; line-height: 1.5;
        }

        .edit-form {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          display: flex; flex-direction: column; gap: 24px;
        }

        .alert {
          padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
        }

        .alert.success {
          background: rgba(62,207,207,0.1); border: 1px solid rgba(62,207,207,0.25);
          color: #4ade80;
        }

        .alert.error {
          background: rgba(255,77,79,0.1); border: 1px solid rgba(255,77,79,0.25);
          color: #ff7875;
        }

        .form-section-title {
          font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.6);
          margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;
        }

        .form-section { display: flex; flex-direction: column; gap: 16px; }

        .form-group { display: flex; flex-direction: column; gap: 6px; }

        .form-label {
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6);
        }

        .required { color: #ff7875; }

        .form-hint { font-size: 11px; color: rgba(255,255,255,0.3); }

        .form-input, .form-textarea {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 11px 14px;
          color: #ffffff; font-size: 14px; outline: none;
          transition: all 0.2s; font-family: inherit;
          resize: vertical;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: rgba(108,99,255,0.6);
          background: rgba(108,99,255,0.08);
          box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
        }

        .form-input::placeholder, .form-textarea::placeholder {
          color: rgba(255,255,255,0.25);
        }

        .form-input.disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        .form-actions {
          display: flex; justify-content: flex-end;
        }

        .save-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 24px;
          background: #22c55e;
          color: #050505;
          border: none; border-radius: 10px; color: white;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(108,99,255,0.4);
        }

        .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

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
