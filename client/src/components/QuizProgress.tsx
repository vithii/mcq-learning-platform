import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface QuizProgressProps {
  currentPosition: number;
  totalQuestions: number;
  completedCount: number;
  correctCount: number;
  incorrectCount: number;
  mode: string;
  timeLimitSec?: number;
  onTimeExpired?: () => void;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  currentPosition,
  totalQuestions,
  completedCount,
  correctCount,
  incorrectCount,
  mode,
  timeLimitSec = 0,
  onTimeExpired
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeLimitSec);

  useEffect(() => {
    if (timeLimitSec <= 0) return;

    setSecondsRemaining(timeLimitSec);
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeExpired) onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimitSec, onTimeExpired]);

  const percentage = totalQuestions > 0 ? Math.min(100, Math.round((completedCount / totalQuestions) * 100)) : 0;

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="quiz-header">
      <div className="quiz-stats-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
            Question {Math.min(currentPosition, totalQuestions)} of {totalQuestions}
          </span>
          <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {mode} Mode
          </span>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
            <CheckCircle2 size={16} />
            <span style={{ fontWeight: 600 }}>{correctCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}>
            <XCircle size={16} />
            <span style={{ fontWeight: 600 }}>{incorrectCount}</span>
          </div>

          {timeLimitSec > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              color: secondsRemaining < 60 ? 'var(--danger)' : 'var(--text-muted)'
            }}>
              <Clock size={16} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};
