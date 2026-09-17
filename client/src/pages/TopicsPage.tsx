import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Compass, BookOpen, ChevronRight, Play } from 'lucide-react';

export const TopicsPage: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.getTopics()
      .then(res => setTopics(res?.topics || (Array.isArray(res) ? res : [])))
      .catch(err => console.error('Failed to load topics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Compass size={24} style={{ color: 'var(--primary-light)' }} />
          <h1 style={{ fontSize: '1.85rem' }}>Browse Topics</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Explore structured knowledge areas, subtopics, and practice questions.
        </p>
      </div>

      <div className="grid-2">
        {topics.map(t => (
          <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.35rem' }}>{t.name}</h2>
                <span className="badge badge-primary">
                  {t.question_count || 0} Questions
                </span>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.25rem' }}>
                {t.description || 'No description provided.'}
              </p>

              {/* Subtopics List */}
              {t.subtopics && t.subtopics.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                    Subtopics ({t.subtopics.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {t.subtopics.map((s: any) => (
                      <span
                        key={s.id}
                        className="badge"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                      >
                        {s.name} ({s.question_count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <Link to={`/topics/${t.id}`} className="btn btn-secondary" style={{ flex: 1 }}>
                <span>View Details</span>
                <ChevronRight size={16} />
              </Link>
              <Link to={`/quiz/setup?topicId=${t.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                <Play size={16} />
                <span>Practice Topic</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
