import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Zap, LogIn, Key, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await login(email, password);
      addToast({ type: 'success', message: 'Welcome back!' });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Sign in to continue your adaptive learning journey
          </p>
        </div>

        {errorMessage && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" htmlFor="login-password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '0.5rem' }}
            disabled={submitting}
          >
            <LogIn size={18} />
            <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Admin Helper */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-block"
            onClick={() => {
              setEmail('admin@mcqplatform.local');
              setPassword('AdminPass123!');
              setErrorMessage('');
            }}
          >
            <Key size={14} />
            <span>Autofill Initial Admin (`admin@mcqplatform.local`)</span>
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};
