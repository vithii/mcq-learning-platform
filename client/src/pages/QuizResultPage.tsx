import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  Trophy,
  Target,
  Clock,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizResultPage: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    ApiClient.getQuizResults(sessionId)
      .then(res => {
        setData(res);
        // Confetti celebration if high accuracy
        if (res?.summary?.accuracy >= 75) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      })
      .catch(err => console.error('Failed to load quiz results:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Quiz results not found</h2>
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const summary = data?.summary || data?.stats || {
    accuracy: data?.session?.accuracy || 0,
    score: data?.session?.score || 0,
    correctCount: 0,
    totalAnswered: data?.questions?.length || 0,
    incorrectCount: 0,
    durationSec: 0,
    avgResponseTimeMs: 0,
    strongAreas: [],
    weakAreas: [],
    reviewQuestionsCount: 0
  };
  const questions = data?.questions || [];
  const reviewQuestions = data?.reviewQuestions || questions.filter((q: any) => !q.isCorrect && q.is_correct !== 1);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="page-container" style={{ maxWidth: '840px' }}>
      {/* Result Hero Header */}
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '2rem', background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), var(--bg-card))' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: 'var(--radius-full)',
          background: summary.accuracy >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          color: summary.accuracy >= 80 ? 'var(--success)' : 'var(--primary-light)'
        }}>
          <Trophy size={36} />
        </div>

        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Quiz Completed!</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          {summary.accuracy >= 90
            ? 'Outstanding performance! You displayed exceptional mastery.'
            : summary.accuracy >= 70
            ? 'Great effort! Spaced repetition will reinforce questions you missed.'
            : 'Good practice session! Review your mistakes below to strengthen retention.'}
        </p>

        {/* Big Numbers Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '1rem',
          maxWidth: '650px',
          margin: '0 auto'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>ACCURACY</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: summary.accuracy >= 80 ? 'var(--success)' : summary.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
              {summary.accuracy}%
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>SCORE</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {summary.score}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>CORRECT</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>
              {summary.correctCount} / {summary.totalAnswered}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>TIME SPENT</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatDuration(summary.durationSec)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          {summary.incorrectCount > 0 && (
            <Link to="/mistakes" className="btn btn-primary btn-lg">
              <RotateCcw size={18} />
              <span>Review Mistakes Queue ({summary.reviewQuestionsCount})</span>
            </Link>
          )}

          <Link to="/quiz/setup" className="btn btn-secondary btn-lg">
            <span>Practice Another Topic</span>
          </Link>

          <Link to="/dashboard" className="btn btn-ghost btn-lg">
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Strong & Weak Areas Summary */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Strong Topics</h3>
          </div>
          {summary.strongAreas && summary.strongAreas.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {summary.strongAreas.map((area: string, i: number) => (
                <span key={i} className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                  ✓ {area}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Keep practicing to build your strong topics portfolio.
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Needs Review</h3>
          </div>
          {summary.weakAreas && summary.weakAreas.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {summary.weakAreas.map((area: string, i: number) => (
                <span key={i} className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                  • {area}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ No weak areas detected in this quiz!
            </div>
          )}
        </div>
      </div>

      {/* Detailed Question Review List */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Question-by-Question Audit</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q: any, index: number) => {
            const isCorrect = q.is_correct === 1;
            return (
              <div
                key={q.qq_id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dim)' }}>#{index + 1}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{q.topic_name}</span>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.75rem' }}>{q.subtopic_name}</span>
                  </div>

                  <span className={`badge ${isCorrect ? 'badge-success' : 'badge-danger'}`}>
                    {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '1.05rem', margin: '0.75rem 0', color: 'var(--text-main)' }}>
                  {q.question_text}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Your answer: </span>
                    <strong style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                      Option {q.selected_option}
                    </strong>
                  </div>
                  {!isCorrect && (
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Correct answer: </span>
                      <strong style={{ color: 'var(--success)' }}>
                        Option {q.correct_answer}
                      </strong>
                    </div>
                  )}
                </div>

                {q.explanation && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '2px solid var(--border)'
                  }}>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
