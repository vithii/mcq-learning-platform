import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Target, Play, AlertTriangle, ArrowRight } from 'lucide-react';

export const WeakAreasPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.getDetailedAnalytics()
      .then(res => setData(res))
      .catch(err => console.error('Failed to load weak areas:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const subtopics = data?.subtopicStats || [];
  const weakSubtopics = subtopics.filter((s: any) => s.accuracy < 75);

  if (weakSubtopics.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<Target size={32} style={{ color: 'var(--success)' }} />}
          title="No Weak Areas Detected!"
          description="Your accuracy across all attempted topics is above 75%! Continue with standard practice to maintain mastery."
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
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Weak Areas Drill-Down</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Topics and subtopics where your historical accuracy is lowest (&lt; 75%). Practice them specifically to boost your overall retention.
          </p>
        </div>

        <Link to="/quiz/setup?mode=weak_areas" className="btn btn-primary btn-lg">
          <Play size={18} />
          <span>Practice Weak Areas</span>
        </Link>
      </div>

      <div className="grid-2">
        {weakSubtopics.map((sub: any) => (
          <div key={sub.subtopic_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge badge-primary">{sub.topic_name}</span>
                <span style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: sub.accuracy < 50 ? 'var(--danger)' : 'var(--warning)'
                }}>
                  {sub.accuracy}% Accuracy
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{sub.subtopic_name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {sub.correct_attempts} correct out of {sub.total_attempts} attempts recorded.
              </p>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <Link
                to={`/quiz/setup?mode=practice&subtopicId=${sub.subtopic_id}`}
                className="btn btn-secondary btn-block"
              >
                <Play size={16} />
                <span>Targeted Practice</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
