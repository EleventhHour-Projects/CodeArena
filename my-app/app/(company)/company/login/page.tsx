'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/company/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/company/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-login-page">
      <div className="login-bg">
        <div className="login-blob blob-1" />
        <div className="login-blob blob-2" />
        <div className="login-blob blob-3" />
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#grad1)" />
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22c55e" />
                    <stop offset="1" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="login-title">Company Portal</h1>
            <p className="login-subtitle">Sign in to manage your assessments</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#ff4d4f" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke="#ff4d4f" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="company@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>

          <p className="login-footer">
            Don&apos;t have an account?{' '}
            <span className="login-footer-note">Contact your administrator</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        .company-login-page {
          min-height: 100vh;
          background: #09090b;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #6C63FF, transparent);
          top: -150px;
          left: -150px;
          animation: blobFloat 8s ease-in-out infinite;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #3ECFCF, transparent);
          bottom: -100px;
          right: -100px;
          animation: blobFloat 10s ease-in-out infinite reverse;
        }

        .blob-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #ff6b6b, transparent);
          top: 50%;
          left: 60%;
          animation: blobFloat 12s ease-in-out infinite;
        }

        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
        }

        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 24px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 40px 36px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
          animation: cardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          margin-bottom: 16px;
          display: inline-block;
          animation: logoSpin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }

        @keyframes logoSpin {
          from { opacity: 0; transform: rotate(-10deg) scale(0.8); }
          to { opacity: 1; transform: rotate(0) scale(1); }
        }

        .login-title {
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 77, 79, 0.1);
          border: 1px solid rgba(255, 77, 79, 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          color: #ff7875;
          font-size: 13px;
          font-weight: 500;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          letter-spacing: 0.3px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 13px 14px 13px 44px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .form-input:focus {
          border-color: rgba(108, 99, 255, 0.6);
          background: rgba(108, 99, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.15);
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background: #22c55e;
          color: #050505;
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          letter-spacing: 0.3px;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(108, 99, 255, 0.4);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.35);
        }

        .login-footer-note {
          color: rgba(108, 99, 255, 0.8);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
