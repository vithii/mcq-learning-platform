import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { RotateCcw, Play, CheckCircle2, AlertCircle, Clock, Award } from 'lucide-react';

export const MistakesPage: React.FC = () => {
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMistakes = async () => {
    try {
      const res = await ApiClient.getMistakes();
      setMistakes(res.mistakes || []);
    } catch (err) {
      console.error('Failed to load mistakes queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMistakes();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<CheckCircle2 size={32} style={{ color: 'var(--success)' }} />}
          title="No Mistakes in Queue!"
          description="Outstanding work! There are currently no unresolved mistake questions waiting for review. Keep practicing new topics."
          actionText="Practice New Questions"
          actionLink="/quiz/setup"
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <RotateCcw size={24} style={{ color: '#fbbf24' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Mistakes Review Queue</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Active questions you previously struggled with. They will be removed once mastered through repeated correct answers.
          </p>
        </div>

        <Link to="/quiz/setup?mode=mistakes" className="btn btn-primary btn-lg">
          <Play size={18} />
          <span>Practice All Mistakes ({mistakes.length})</span>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mistakes.map(m => (
          <div key={m.question_id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-primary">{m.topic_name}</span>
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>{m.subtopic_name}</span>
                <span className={`badge badge-mastery-${m.mastery_level}`}>
                  {m.mastery_level}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                  ✕ {m.incorrect_count} mistake{m.incorrect_count > 1 ? 's' : ''}
                </span>
                <span>Streak: {m.current_streak}</span>
              </div>
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              {m.question_text}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Last Answer: </span>
                <strong style={{ color: 'var(--danger)' }}>Option {m.last_selected_option || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Correct Answer: </span>
                <strong style={{ color: 'var(--success)' }}>Option {m.correct_answer}</strong>
              </div>
            </div>

            {m.explanation && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--border)'
              }}>
                {m.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
