import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { BarChart3, TrendingUp, Compass, Layers, CheckCircle2, Target, Award } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.getDetailedAnalytics()
      .then(res => setData(res))
      .catch(err => console.error('Failed to load detailed analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const topicStats = data?.topicStats || [];
  const subtopicStats = data?.subtopicStats || [];
  const improvement = data?.improvement;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <BarChart3 size={24} style={{ color: 'var(--primary-light)' }} />
          <h1 style={{ fontSize: '1.85rem' }}>Performance Analytics</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Detailed breakdown of your accuracy trends, topic mastery, and active retention.
        </p>
      </div>

      {/* Improvement Metric Banner (Section 21) */}
      <div className="card" style={{ marginBottom: '2rem', background: 'radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.1), var(--bg-card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <TrendingUp size={20} style={{ color: 'var(--success)' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Improvement Trend (7-Day Comparison)</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENT 7-DAY ACCURACY</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {improvement?.currentPeriodAccuracy !== null ? `${improvement.currentPeriodAccuracy}%` : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>PREVIOUS 7-DAY ACCURACY</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              {improvement?.previousPeriodAccuracy !== null ? `${improvement.previousPeriodAccuracy}%` : 'N/A'}
            </div>
          </div>

          {improvement?.percentagePointsDiff !== null && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>PERCENTAGE-POINT CHANGE</div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: improvement.percentagePointsDiff >= 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {improvement.percentagePointsDiff >= 0 ? `+${improvement.percentagePointsDiff}` : improvement.percentagePointsDiff} pp
              </div>
            </div>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {improvement?.interpretation}
        </p>
      </div>

      {/* Topic Breakdown */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Compass size={20} style={{ color: 'var(--primary-light)' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Performance by Topic</h2>
        </div>

        {topicStats.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', padding: '1rem 0' }}>No topic data recorded yet.</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Attempts</th>
                  <th>Accuracy</th>
                  <th>Mastered Questions</th>
                </tr>
              </thead>
              <tbody>
                {topicStats.map((t: any) => (
                  <tr key={t.topic_id}>
                    <td><strong>{t.topic_name}</strong></td>
                    <td>{t.total_attempts}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontWeight: 700,
                          minWidth: '40px',
                          color: t.accuracy >= 80 ? 'var(--success)' : t.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {t.accuracy}%
                        </span>
                        <div className="progress-bar-track" style={{ width: '100px', height: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: `${t.accuracy}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        ★ {t.mastered_count} Mastered
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subtopic Breakdown */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Layers size={20} style={{ color: 'var(--accent-light)' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Performance by Subtopic</h2>
        </div>

        {subtopicStats.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', padding: '1rem 0' }}>No subtopic data recorded yet.</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subtopic</th>
                  <th>Topic</th>
                  <th>Attempts</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {subtopicStats.map((s: any) => (
                  <tr key={s.subtopic_id}>
                    <td><strong>{s.subtopic_name}</strong></td>
                    <td><span className="badge badge-primary">{s.topic_name}</span></td>
                    <td>{s.total_attempts}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: s.accuracy >= 80 ? 'var(--success)' : s.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {s.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
