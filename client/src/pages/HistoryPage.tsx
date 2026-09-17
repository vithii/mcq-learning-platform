import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { History, Play, ChevronRight, Calendar, Clock, Award } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res = await ApiClient.getQuizHistory(p, 20);
      setHistory(res.history || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (err) {
      console.error('Failed to load quiz history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  if (loading && history.length === 0) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<History size={32} style={{ color: 'var(--primary-light)' }} />}
          title="No Quiz History Yet"
          description="You haven't completed any quizzes yet. Complete your first quiz to view your score history and performance logs here."
          actionText="Start First Quiz"
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
            <History size={24} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Quiz History</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Review all your past quiz sessions, scores, and question-by-question breakdowns.
          </p>
        </div>

        <Link to="/quiz/setup" className="btn btn-primary">
          <Play size={18} />
          <span>New Practice</span>
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Topic</th>
                <th>Mode</th>
                <th>Accuracy</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map(q => (
                <tr key={q.id}>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                    {new Date(q.completed_at || q.started_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    <strong>{q.topic_name}</strong>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {q.mode}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: q.accuracy >= 80 ? 'var(--success)' : q.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {q.accuracy}%
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{q.score} pts</span>
                  </td>
                  <td>
                    <Link to={`/quiz/${q.id}/results`} className="btn btn-secondary btn-sm">
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
