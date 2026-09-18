import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { Bookmark, Play, Trash2 } from 'lucide-react';
import { useCrossTabSync } from '../services/syncService';

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchBookmarks = async () => {
    try {
      const res = await ApiClient.getBookmarks();
      setBookmarks(res.bookmarks || []);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  useCrossTabSync(['bookmarks', 'questions', 'all'], () => {
    fetchBookmarks();
  });

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await ApiClient.toggleBookmark(questionId);
      setBookmarks(prev => prev.filter(b => b.question_id !== questionId));
      addToast({ type: 'info', message: 'Bookmark removed' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to remove bookmark' });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<Bookmark size={32} style={{ color: '#fbbf24' }} />}
          title="No Bookmarks Yet"
          description="You haven't saved any questions yet. Click the bookmark icon on any question card during a quiz to save it for quick review."
          actionText="Start Practice Session"
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
            <Bookmark size={24} style={{ color: '#fbbf24' }} />
            <h1 style={{ fontSize: '1.85rem' }}>My Bookmarks</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Questions you flagged during previous quizzes for focused study.
          </p>
        </div>

        <Link to="/quiz/setup?mode=bookmarks" className="btn btn-primary btn-lg">
          <Play size={18} />
          <span>Practice Bookmarks ({bookmarks.length})</span>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {bookmarks.map(b => (
          <div key={b.bookmark_id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-primary">{b.topic_name}</span>
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>{b.subtopic_name}</span>
                <span className={`badge badge-mastery-${b.mastery_level}`}>
                  {b.mastery_level}
                </span>
              </div>

              <button
                onClick={() => handleRemoveBookmark(b.question_id)}
                className="btn-ghost"
                style={{ padding: '6px', color: 'var(--danger)', cursor: 'pointer' }}
                title="Remove bookmark"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              {b.question_text}
            </div>

            <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Correct Answer: </span>
              <strong style={{ color: 'var(--success)' }}>Option {b.correct_answer}</strong>
            </div>

            {b.explanation && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--border)'
              }}>
                {b.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
