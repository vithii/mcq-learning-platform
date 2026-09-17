import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../../services/api';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import {
  ShieldCheck,
  Users,
  HelpCircle,
  FolderTree,
  UploadCloud,
  Activity,
  HeartPulse,
  Download,
  ArrowRight,
  TrendingUp,
  FileCode
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ApiClient.getAdminAnalytics(),
      ApiClient.getContentHealth()
    ])
      .then(([analyticsRes, healthRes]) => {
        setData(analyticsRes);
        setHealth(healthRes);
      })
      .catch(err => console.error('Failed to load admin dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportJSON = () => {
    window.open('/api/admin/export', '_blank');
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const topicDist = data?.topicDistribution || [];
  const diffDist = data?.difficultyDistribution || [];
  const recentImports = data?.recentImports || [];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ShieldCheck size={26} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Administrator Console</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            System-wide content health, question distributions, JSON management, and user auditing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleExportJSON} className="btn btn-secondary">
            <Download size={16} />
            <span>Export Canonical JSON</span>
          </button>
          <Link to="/admin/import" className="btn btn-primary">
            <UploadCloud size={16} />
            <span>Import JSON</span>
          </Link>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL LEARNERS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{metrics.totalUsers}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{metrics.activeUsers} active accounts</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>QUESTION BANK</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{metrics.totalQuestions}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Across {metrics.totalTopics} topics</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>COMPLETED QUIZZES</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{metrics.totalQuizzes}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{metrics.totalAttempts} total attempts</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>SYSTEM ACCURACY</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>{metrics.overallAccuracy}%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Platform aggregate</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <Link to="/admin/questions" className="card card-interactive">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <HelpCircle size={22} style={{ color: 'var(--primary-light)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Question Manager</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Search, edit, filter, and author questions in the question bank.
          </p>
        </Link>

        <Link to="/admin/topics" className="card card-interactive">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <FolderTree size={22} style={{ color: 'var(--accent-light)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Topic Organization</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage category hierarchies, topic titles, and subtopic trees.
          </p>
        </Link>

        <Link to="/admin/content-health" className="card card-interactive">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <HeartPulse size={22} style={{ color: health?.healthScore >= 90 ? 'var(--success)' : '#f59e0b' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Content Health ({health?.healthScore || 100}%)</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Audit missing explanations, short prompts, or empty subtopics.
          </p>
        </Link>
      </div>

      {/* Distribution & Recent Imports Grid */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Questions by Topic */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Questions by Topic</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topicDist.map((t: any) => {
              const pct = metrics.totalQuestions > 0 ? Math.round((t.question_count / metrics.totalQuestions) * 100) : 0;
              return (
                <div key={t.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{t.question_count} questions ({pct}%)</span>
                  </div>
                  <div className="progress-bar-track" style={{ height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent JSON Imports */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Recent JSON Ingestions</h3>
            <Link to="/admin/import" style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600 }}>
              New Import →
            </Link>
          </div>

          {recentImports.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0' }}>
              No import history recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentImports.map((job: any) => (
                <div
                  key={job.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{job.filename}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {job.imported_questions} new, {job.updated_questions} updated • {new Date(job.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`badge ${job.status === 'completed' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
