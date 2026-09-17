import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Brain, Repeat, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <span className="brand-title" style={{ fontSize: '1.25rem' }}>AdaptiveMCQ</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              <span>Go to Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '5rem 1.5rem',
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div className="badge badge-primary" style={{ marginBottom: '1.5rem', padding: '0.4rem 1rem' }}>
          <Brain size={16} />
          <span>Active Recall & Spaced Repetition Platform</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
          Master Any Subject Through <span style={{ background: 'linear-gradient(135deg, var(--primary-light), #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Adaptive Mistake Repetition</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '680px', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          Transform structured JSON question banks into an interactive, high-retention learning experience. Questions you struggle with return adaptively until they are fully mastered.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to={user ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
            <span>Start Learning Now</span>
            <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            <span>Explore Demo Account</span>
          </Link>
        </div>

        {/* Quick Highlights */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '3.5rem',
          color: 'var(--text-dim)',
          fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
            <span>In-session dynamic repeats</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
            <span>Spaced repetition mastery</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
            <span>Single-click JSON import</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
            <span>Personalized analytics</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ padding: '3rem 1.5rem 6rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div className="grid-3">
          <div className="card">
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)', marginBottom: '1rem' }}>
              <Repeat size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Adaptive Mistake Repetition</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              When you answer incorrectly, the question is dynamically re-scheduled 3–5 questions later in the session, cementing learning before you finish.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', marginBottom: '1rem' }}>
              <Brain size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>4-Stage Mastery Progression</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              Track every question from NEW to LEARNING, REVIEWING, and MASTERED. Mastery requires repeated consistency and automatically downgrades on mistakes.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', marginBottom: '1rem' }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Meaningful Analytics</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              Separate pure accuracy from score bonuses. View percentage-point improvement trends, topic weak spots, and compare achievements on the leaderboard.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', padding: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        AdaptiveMCQ Platform • Built for high-yield learning and test mastery
      </footer>
    </div>
  );
};
