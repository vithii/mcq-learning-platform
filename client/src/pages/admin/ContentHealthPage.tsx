import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../../services/api';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { HeartPulse, AlertTriangle, CheckCircle2, FileQuestion, HelpCircle, ArrowRight } from 'lucide-react';

export const ContentHealthPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.getContentHealth()
      .then(res => setData(res))
      .catch(err => console.error('Failed to load content health:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const issues = data?.issues || {};
  const score = data?.healthScore || 100;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <HeartPulse size={24} style={{ color: score >= 85 ? 'var(--success)' : '#f59e0b' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Content Quality & Health Audit</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Automated verification of explanations, option counts, empty topics, and metadata integrity.
          </p>
        </div>

        <div className="badge" style={{
          padding: '0.5rem 1.25rem',
          fontSize: '1rem',
          background: score >= 85 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: score >= 85 ? 'var(--success)' : '#fbbf24',
          border: `1px solid ${score >= 85 ? 'var(--success-border)' : 'var(--warning-border)'}`
        }}>
          Health Score: {score} / 100
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>MISSING EXPLANATIONS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: issues.missingExplanationsCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {issues.missingExplanationsCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>LESS THAN 4 OPTIONS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: issues.fewOptionsCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {issues.fewOptionsCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>EMPTY TOPICS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: issues.emptyTopicsCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {issues.emptyTopicsCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>EMPTY SUBTOPICS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: issues.emptySubtopicsCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {issues.emptySubtopicsCount}
          </div>
        </div>
      </div>

      {/* Detailed Issues Sections */}
      {issues.missingExplanationsCount > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Questions Lacking Explanations ({issues.missingExplanationsCount})</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Active recall requires clear explanations when users answer incorrectly.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Question Prompt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.missingExplanations.map((q: any) => (
                  <tr key={q.id}>
                    <td><span className="badge badge-primary">{q.topic_name}</span></td>
                    <td style={{ maxWidth: '350px' }}>{q.question_text}</td>
                    <td>
                      <Link to="/admin/questions" className="btn btn-secondary btn-sm">
                        <span>Edit in Manager</span>
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {issues.emptySubtopicsCount > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Subtopics with Zero Questions ({issues.emptySubtopicsCount})</h3>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Parent Topic</th>
                  <th>Subtopic Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.emptySubtopics.map((s: any) => (
                  <tr key={s.id}>
                    <td><strong>{s.topic_name}</strong></td>
                    <td>{s.name}</td>
                    <td>
                      <Link to="/admin/questions" className="btn btn-primary btn-sm">
                        <span>Add Questions</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {issues.missingExplanationsCount === 0 && issues.emptySubtopicsCount === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--success)' }}>
          <CheckCircle2 size={48} style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Content Bank is in Prime Health!</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            All questions have explanations, sufficient options, and valid topic assignments.
          </p>
        </div>
      )}
    </div>
  );
};
