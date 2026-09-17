import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, Repeat, Award } from 'lucide-react';

interface FeedbackPanelProps {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string | null;
  explanation?: string | null;
  repetitionScheduled?: boolean;
  repeatedAtPosition?: number | null;
  isComplete?: boolean;
  onContinue: () => void;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  isCorrect,
  userAnswer,
  correctAnswer,
  explanation,
  repetitionScheduled,
  repeatedAtPosition,
  isComplete,
  onContinue
}) => {
  return (
    <div className={`feedback-panel ${isCorrect ? 'correct' : 'incorrect'}`}>
      <div className="feedback-header">
        {isCorrect ? (
          <>
            <CheckCircle2 size={24} />
            <span>✓ Correct!</span>
          </>
        ) : (
          <>
            <XCircle size={24} />
            <span>✕ Incorrect</span>
          </>
        )}
      </div>

      {!isCorrect && correctAnswer && (
        <div style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
          <div><span style={{ color: 'var(--text-dim)' }}>Your answer:</span> <strong style={{ color: 'var(--danger)' }}>{userAnswer}</strong></div>
          <div style={{ marginTop: '2px' }}><span style={{ color: 'var(--text-dim)' }}>Correct answer:</span> <strong style={{ color: 'var(--success)' }}>Option {correctAnswer}</strong></div>
        </div>
      )}

      {explanation && (
        <div className="feedback-explanation">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '2px' }}>
            Explanation
          </div>
          {explanation}
        </div>
      )}

      {repetitionScheduled && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0.75rem 0 0.5rem 0',
          fontSize: '0.85rem',
          color: '#fbbf24',
          fontWeight: 500
        }}>
          <Repeat size={16} />
          <span>Adaptive repetition queued: This question will reappear later in your session!</span>
        </div>
      )}

      {isComplete && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0.75rem 0 0.25rem 0',
          padding: '0.65rem 0.85rem',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--primary-light)',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          <Award size={18} />
          <span>Session Complete! All questions in this quiz have been answered.</span>
        </div>
      )}

      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onContinue}
          autoFocus
        >
          <span>{isComplete ? 'Finish & View Results' : 'Continue'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
