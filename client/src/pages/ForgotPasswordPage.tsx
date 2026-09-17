import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Zap, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [submitting, setSubmitting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const { addToast } = useToast();

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ApiClient.forgotPassword(email);
      addToast({ type: 'info', message: res.message });
      if (res.resetToken) {
        setGeneratedToken(res.resetToken);
        setToken(res.resetToken);
      }
      setStep('reset');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to request reset token' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ApiClient.resetPassword(token, newPassword);
      addToast({ type: 'success', message: res.message });
      setStep('request');
      setGeneratedToken(null);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to reset password' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, var(--bg-base) 65%)'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: '48px', height: '48px' }}>
            <Zap size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {step === 'request'
              ? 'Enter your account email to receive a password reset token'
              : 'Enter your reset token and your new password'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestToken}>
            <div className="input-group">
              <label className="input-label" htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: '0.5rem' }}
              disabled={submitting}
            >
              <KeyRound size={18} />
              <span>{submitting ? 'Generating token...' : 'Request Reset Token'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            {generatedToken && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} /> Token Generated
                </div>
                <div style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                  {generatedToken}
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="token-input">Reset Token</label>
              <input
                id="token-input"
                type="text"
                className="input"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="new-pass-input">New Password</label>
              <input
                id="new-pass-input"
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: '0.5rem' }}
              disabled={submitting}
            >
              <span>{submitting ? 'Updating password...' : 'Confirm New Password'}</span>
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
