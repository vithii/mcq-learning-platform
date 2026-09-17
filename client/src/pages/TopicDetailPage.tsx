import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ArrowLeft, Play, Layers, Award, Target, CheckCircle2, BookOpen } from 'lucide-react';

export const TopicDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ApiClient.getTopic(id)
      .then(res => setTopic(res.topic))
      .catch(err => console.error('Failed to load topic:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Topic not found</h2>
        <Link to="/topics" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Topics
        </Link>
      </div>
    );
  }

  const topicProgress = topic.progress_percent || 0;
  const topicMastery = topic.mastery_percent || 0;
  const totalAttempted = topic.attempted_count || 0;
  const totalQuestions = topic.question_count || 0;
  const totalMastered = topic.mastered_count || 0;

  return (
    <div className="page-container">
      <Link to="/topics" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} />
        <span>All Topics</span>
      </Link>

      {/* Main Topic Header Card with Overall Progress */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: '1 1 500px' }}>
            <h1 style={{ fontSize: '2.1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{topic.name}</h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: '680px', fontSize: '1.05rem', lineHeight: '1.5' }}>
              {topic.description || 'Comprehensive question bank and active recall modules.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to={`/quiz/setup?topicId=${topic.id}&mode=practice`} className="btn btn-primary btn-lg">
              <Play size={18} />
              <span>Practice All ({totalQuestions})</span>
            </Link>
            <Link to={`/quiz/setup?topicId=${topic.id}&mode=test`} className="btn btn-secondary btn-lg">
              <CheckCircle2 size={18} />
              <span>Timed Test</span>
            </Link>
          </div>
        </div>

        {/* Overall Topic Progress Bar */}
        <div style={{ background: 'var(--surface-elevated, rgba(255, 255, 255, 0.03))', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} style={{ color: 'var(--primary-light, #6366f1)' }} />
              Overall Topic Mastery
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {totalAttempted} of {totalQuestions} practiced ({topicProgress}%) • {totalMastered} Mastered ({topicMastery}%)
            </span>
          </div>

          {/* Dual Multi-color Progress Bar */}
          <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: `${topicProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Subtopics Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={22} style={{ color: 'var(--primary-light, #818cf8)' }} />
          <h2 style={{ fontSize: '1.4rem' }}>Subtopic Progress & Modules</h2>
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {topic.subtopics?.length || 0} Subtopics Available
        </span>
      </div>

      {/* Subtopics Grid with Individual Progress Bars */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        {topic.subtopics && topic.subtopics.map((sub: any) => {
          const subProgress = sub.progress_percent || 0;
          const subMastered = sub.mastered_count || 0;
          const subAttempted = sub.attempted_count || 0;
          const subTotal = sub.question_count || 0;
          const subAccuracy = sub.accuracy;

          return (
            <div
              key={sub.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                borderRadius: '14px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                background: 'var(--surface-card, #131722)',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div>
                {/* Title & Question Count Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 600, color: 'var(--text-main)' }}>{sub.name}</h3>
                  <span className="badge badge-primary" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {subTotal} Questions
                  </span>
                </div>

                {/* Description */}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.45' }}>
                  {sub.description || 'Targeted active recall practice questions for this subtopic.'}
                </p>

                {/* Individual Subtopic Progress Bar Card */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: subProgress > 0 ? 'var(--primary-light, #a5b4fc)' : 'var(--text-dim)' }}>
                      {subProgress > 0 ? `${subProgress}% Practiced` : 'Not Started'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {subAttempted} / {subTotal}
                    </span>
                  </div>

                  {/* Visual Progress Bar Track */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${subProgress}%`,
                        height: '100%',
                        background: subProgress >= 80
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : 'linear-gradient(90deg, #6366f1, #3b82f6)',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  {/* Micro Badges: Mastered & Accuracy */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', fontSize: '0.76rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    {subMastered > 0 && (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Award size={13} /> {subMastered} Mastered
                      </span>
                    )}
                    {subAccuracy !== null && subAccuracy !== undefined && (
                      <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Target size={13} /> {subAccuracy}% Accuracy
                      </span>
                    )}
                    {subProgress === 0 && (
                      <span style={{ color: 'var(--text-dim)' }}>
                        Start your first quiz session to track mastery.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: 'auto' }}>
                <Link
                  to={`/quiz/setup?topicId=${topic.id}&subtopicId=${sub.id}&mode=practice`}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem', padding: '0.6rem 0.75rem' }}
                >
                  <Play size={15} />
                  <span>Practice</span>
                </Link>
                <Link
                  to={`/quiz/setup?topicId=${topic.id}&subtopicId=${sub.id}&mode=test`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem', padding: '0.6rem 0.75rem' }}
                >
                  <CheckCircle2 size={15} />
                  <span>Test</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
