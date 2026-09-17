import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ActivityChart, MasteryBreakdownChart } from '../components/Charts';
import {
  Flame,
  Award,
  Target,
  CheckCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Play,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Brain,
  History,
  BookOpen,
  Layers,
  FolderTree,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Search & Filter state for topic tracking
  const [topicSearch, setTopicSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in_progress' | 'unstarted' | 'needs_review'>('all');
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  const toggleTopic = (topicId: string) => {
    setCollapsedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const fetchDashboard = async () => {
    try {
      const res = await ApiClient.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recommendations = data?.recommendations || [];
  const recentQuizzes = data?.recentQuizzes || [];
  const dailyActivity = data?.dailyActivity || [];
  const masteryBreakdown = data?.masteryBreakdown || { NEW: 0, LEARNING: 0, REVIEWING: 0, MASTERED: 0 };
  const topicProgress: any[] = data?.topicProgress || [];

  // Filter topics and subtopics based on search and selected filter mode
  const matchesSearch = (text: string) => (text || '').toLowerCase().includes(topicSearch.toLowerCase().trim());

  const filteredTopics = topicProgress.map(topic => {
    const matchingSubtopics = (topic.subtopics || []).filter((sub: any) => {
      // Search matching
      if (topicSearch.trim()) {
        const matchTopic = matchesSearch(topic.name);
        const matchSub = matchesSearch(sub.name) || matchesSearch(sub.description || '');
        if (!matchTopic && !matchSub) return false;
      }
      // Filter mode
      if (filterMode === 'in_progress') return (sub.attempted_count || 0) > 0 && (sub.progress_percent || 0) < 100;
      if (filterMode === 'unstarted') return (sub.attempted_count || 0) === 0;
      if (filterMode === 'needs_review') return sub.accuracy !== null && sub.accuracy < 70;
      return true;
    });

    const topicMatchesSearch = topicSearch.trim() ? matchesSearch(topic.name) : true;
    return {
      ...topic,
      visibleSubtopics: matchingSubtopics,
      isVisible: topicMatchesSearch || matchingSubtopics.length > 0
    };
  }).filter(t => t.isVisible);

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
              Welcome back, {user?.name.split(' ')[0]}!
            </h1>
            <span style={{ fontSize: '1.5rem' }}>👋</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Ready to test your active recall and strengthen weak areas today?
          </p>
        </div>

        <Link to="/quiz/setup" className="btn btn-primary btn-lg">
          <Play size={20} />
          <span>Start Practice</span>
        </Link>
      </div>

      {/* Top Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        {/* Streak */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            flexShrink: 0
          }}>
            <Flame size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>DAILY STREAK</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {user?.current_streak || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
            </div>
          </div>
        </div>

        {/* Overall Accuracy */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            flexShrink: 0
          }}>
            <Target size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>OVERALL ACCURACY</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {stats.overallAccuracy || 0}%
            </div>
          </div>
        </div>

        {/* Mastered Questions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-light)',
            flexShrink: 0
          }}>
            <Award size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>MASTERED QUESTIONS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {stats.masteredCount || 0}
            </div>
          </div>
        </div>

        {/* Level & XP */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-light)',
            flexShrink: 0
          }}>
            <Sparkles size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>LEVEL & XP</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Lvl {user?.level || 1} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>({user?.xp || 0} XP)</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TOPIC & SUBTOPIC SCORE TRACKING & MASTERY HIERARCHY
          ===================================================================== */}
      <div style={{ marginBottom: '3rem' }}>
        {/* Section Header with Search & Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <BookOpen size={22} style={{ color: 'var(--primary-light)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Knowledge Mastery by Topic & Subtopic</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              Detailed tracking scores and spaced repetition progress across every topic and its subtopics.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2.4rem', height: '38px', minHeight: '38px', fontSize: '0.875rem' }}
                placeholder="Search topic or subtopic..."
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'needs_review', label: 'Needs Review' },
                { id: 'unstarted', label: 'Unstarted' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`btn ${filterMode === tab.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ minHeight: '38px', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State when no topics imported */}
        {topicProgress.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <BookOpen size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Questions or Topics Available Yet</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.925rem' }}>
              Import your custom question bank through the JSON importer to start tracking topic and subtopic scores.
            </p>
            {user?.role === 'admin' ? (
              <Link to="/admin/import" className="btn btn-primary">
                <span>Import JSON Question Bank</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/topics" className="btn btn-secondary">
                <span>Browse Topics</span>
              </Link>
            )}
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-dim)' }}>
            No topics or subtopics match your current search and filter settings.
          </div>
        ) : (
          /* List of Topics with Indented Subtopics Hierarchy */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {filteredTopics.map(topic => {
              const isCollapsed = !!collapsedTopics[topic.id];
              const totalTopicQ = topic.question_count || 0;
              const attemptedTopicQ = topic.attempted_count || 0;
              const masteredTopicQ = topic.mastered_count || 0;
              const topicAccuracy = topic.accuracy;
              const topicProgressPercent = topic.progress_percent || 0;

              return (
                <div key={topic.id} className="topic-hierarchy-card">
                  {/* Master Topic Header */}
                  <div className="topic-master-header">
                    <div style={{ flex: '1 1 380px' }}>
                      <div className="topic-meta-badge">
                        <Layers size={13} />
                        <span>Parent Topic</span>
                      </div>
                      <h3 style={{ fontSize: '1.45rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                        {topic.name}
                      </h3>
                      {topic.description && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '680px', lineHeight: '1.45', marginBottom: '0.75rem' }}>
                          {topic.description}
                        </p>
                      )}

                      {/* Topic Summary Chips */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                          📚 {totalTopicQ} Questions
                        </span>
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                          📑 {topic.subtopics?.length || 0} Subtopics
                        </span>
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                          ✓ {attemptedTopicQ} Practiced ({topicProgressPercent}%)
                        </span>
                        {masteredTopicQ > 0 && (
                          <span className="badge badge-success">
                            ★ {masteredTopicQ} Mastered ({topic.mastery_percent || 0}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Topic Score & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '220px' }}>
                      {/* Topic Score Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          Overall Topic Score
                        </div>
                        {topicAccuracy !== null && topicAccuracy !== undefined ? (
                          <span
                            className={`score-badge ${topicAccuracy >= 80 ? 'score-badge-high' : topicAccuracy >= 60 ? 'score-badge-med' : 'score-badge-low'}`}
                            style={{ fontSize: '0.95rem', padding: '0.35rem 0.85rem' }}
                          >
                            <Target size={15} />
                            <span>{topicAccuracy}% Accuracy</span>
                          </span>
                        ) : (
                          <span className="score-badge score-badge-none" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                            Not Started Yet
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Link to={`/quiz/setup?topicId=${topic.id}&mode=practice`} className="btn btn-primary btn-sm">
                          <Play size={14} />
                          <span>Practice Topic</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleTopic(topic.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Toggle subtopics list"
                        >
                          <span>{isCollapsed ? 'Show' : 'Hide'} Subtopics ({topic.subtopics?.length || 0})</span>
                          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Topic Progress Bar */}
                  <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${topicProgressPercent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                          borderRadius: '999px',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Nested Subtopics Section (Clear Parent-Child Relation) */}
                  {!isCollapsed && (
                    <div className="subtopic-tree-wrapper">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FolderTree size={18} style={{ color: 'var(--primary-light)' }} />
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                            Subtopics in <span style={{ color: 'var(--primary-light)' }}>{topic.name}</span>
                          </h4>
                          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', fontSize: '0.75rem' }}>
                            {topic.visibleSubtopics.length} modules
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          Click "Practice Subtopic" to target any specific area
                        </span>
                      </div>

                      {topic.visibleSubtopics.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                          No subtopics match your current filter or search criteria.
                        </div>
                      ) : (
                        <div className="subtopic-tree-rail">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                            {topic.visibleSubtopics.map((sub: any) => {
                              const subAccuracy = sub.accuracy;
                              const subProgress = sub.progress_percent || 0;
                              const subMastered = sub.mastered_count || 0;
                              const subAttempted = sub.attempted_count || 0;
                              const subTotal = sub.question_count || 0;

                              return (
                                <div key={sub.id} className="subtopic-tree-card">
                                  {/* Subtopic Header & Score */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div style={{ flex: '1 1 200px' }}>
                                      {/* Clear parent breadcrumb to guarantee visual connection */}
                                      <div className="subtopic-parent-breadcrumb">
                                        <FolderTree size={12} style={{ color: 'var(--primary-light)' }} />
                                        <span>{topic.name}</span>
                                        <span style={{ opacity: 0.5 }}>›</span>
                                        <span style={{ color: 'var(--primary-light)' }}>Subtopic</span>
                                      </div>
                                      <h5 style={{ fontSize: '1.025rem', fontWeight: 600, color: 'var(--text-main)', margin: '0.15rem 0' }}>
                                        {sub.name}
                                      </h5>
                                    </div>

                                    {/* Subtopic Accuracy / Score Badge */}
                                    <div>
                                      {subAccuracy !== null && subAccuracy !== undefined ? (
                                        <span className={`score-badge ${subAccuracy >= 80 ? 'score-badge-high' : subAccuracy >= 60 ? 'score-badge-med' : 'score-badge-low'}`}>
                                          <Target size={13} />
                                          <span>{subAccuracy}% Score</span>
                                        </span>
                                      ) : (
                                        <span className="score-badge score-badge-none">
                                          <span>Not Started</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subtopic Description */}
                                  {sub.description && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '0.85rem', lineHeight: '1.4' }}>
                                      {sub.description}
                                    </p>
                                  )}

                                  {/* Progress Box */}
                                  <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        Coverage: <strong style={{ color: 'var(--text-main)' }}>{subAttempted} / {subTotal}</strong> ({subProgress}%)
                                      </span>
                                      <span style={{ color: subMastered > 0 ? 'var(--success)' : 'var(--text-dim)', fontWeight: 600 }}>
                                        ★ {subMastered} Mastered
                                      </span>
                                    </div>

                                    {/* Mini Progress Track */}
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${subProgress}%`,
                                          height: '100%',
                                          background: subProgress >= 80
                                            ? 'linear-gradient(90deg, #10b981, #059669)'
                                            : 'linear-gradient(90deg, #6366f1, #3b82f6)',
                                          borderRadius: '999px',
                                          transition: 'width 0.3s ease'
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <Link
                                      to={`/quiz/setup?topicId=${topic.id}&subtopicId=${sub.id}&mode=practice`}
                                      className="btn btn-primary btn-sm"
                                      style={{ flex: 1, minHeight: '36px', fontSize: '0.825rem' }}
                                    >
                                      <Play size={13} />
                                      <span>Practice Subtopic</span>
                                    </Link>
                                    <Link
                                      to={`/quiz/setup?topicId=${topic.id}&subtopicId=${sub.id}&mode=test`}
                                      className="btn btn-secondary btn-sm"
                                      style={{ minHeight: '36px', fontSize: '0.825rem' }}
                                      title="Take a timed test on this subtopic"
                                    >
                                      <CheckCircle2 size={13} />
                                      <span>Test</span>
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Personalized Recommendations Section (Section 56) */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Brain size={20} style={{ color: 'var(--primary-light)' }} />
            <h2 style={{ fontSize: '1.25rem' }}>Recommended for You</h2>
          </div>

          <div className="grid-2">
            {recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{rec.title}</h3>
                    {rec.badge && (
                      <span className="badge badge-warning">
                        {rec.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    {rec.description}
                  </p>
                </div>

                <div>
                  <Link to={rec.actionUrl} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>Take Action</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts & Analytics Overview Grid */}
      <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
        {/* Weekly Activity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary-light)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Daily Activity</h3>
            </div>
            <Link to="/analytics" style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600 }}>
              Full Analytics →
            </Link>
          </div>

          <ActivityChart data={dailyActivity} />
        </div>

        {/* Question Mastery Distribution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: 'var(--accent-light)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Mastery Distribution</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {stats.totalAnswered} Questions Attempted
            </span>
          </div>

          <MasteryBreakdownChart mastery={masteryBreakdown} />
        </div>
      </div>

      {/* Recent Quiz Sessions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Recent Quiz Results</h3>
          </div>
          <Link to="/history" style={{ fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>
            View All History →
          </Link>
        </div>

        {recentQuizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)' }}>
            No completed quiz sessions yet. Start your first practice quiz above!
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Mode</th>
                  <th>Accuracy</th>
                  <th>Score</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentQuizzes.map((q: any) => (
                  <tr key={q.id}>
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
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      {new Date(q.completed_at || q.started_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/quiz/${q.id}/results`} className="btn btn-secondary btn-sm">
                        View Details
                      </Link>
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
