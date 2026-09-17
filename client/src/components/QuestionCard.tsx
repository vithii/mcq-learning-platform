import React from 'react';
import { Bookmark, Repeat } from 'lucide-react';

interface QuestionCardProps {
  questionText: string;
  topicName: string;
  subtopicName: string;
  difficulty: string;
  isBookmarked: boolean;
  isRepeated?: boolean;
  repeatCount?: number;
  onToggleBookmark: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  questionText,
  topicName,
  subtopicName,
  difficulty,
  isBookmarked,
  isRepeated,
  repeatCount = 0,
  onToggleBookmark
}) => {
  const diffBadgeClass =
    difficulty === 'easy' ? 'badge-success' :
    difficulty === 'hard' ? 'badge-danger' : 'badge-warning';

  return (
    <div className="quiz-question-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-primary">{topicName}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>/</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtopicName}</span>
          <span className={`badge ${diffBadgeClass}`} style={{ textTransform: 'capitalize' }}>
            {difficulty}
          </span>
          {isRepeated && (
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Repeat size={12} />
              <span>Mistake Review (#{repeatCount})</span>
            </span>
          )}
        </div>

        <button
          onClick={onToggleBookmark}
          className="btn-ghost"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-full)',
            color: isBookmarked ? '#fbbf24' : 'var(--text-dim)',
            cursor: 'pointer'
          }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
          aria-label="Toggle bookmark"
        >
          <Bookmark size={20} fill={isBookmarked ? '#fbbf24' : 'none'} />
        </button>
      </div>

      <div className="question-text">
        {questionText}
      </div>
    </div>
  );
};
