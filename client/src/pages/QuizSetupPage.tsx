import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Play,
  RotateCcw,
  Target,
  Bookmark,
  Clock,
  HelpCircle,
  FileCheck2,
  Brain,
  Sliders,
  AlertCircle
} from 'lucide-react';

export const QuizSetupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mode, setMode] = useState<string>(searchParams.get('mode') || 'practice');
  const [topicId, setTopicId] = useState<string>(searchParams.get('topicId') || 'all');
  const [subtopicId, setSubtopicId] = useState<string>(searchParams.get('subtopicId') || 'all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [customCount, setCustomCount] = useState<string>('');
  const [timeLimitSec, setTimeLimitSec] = useState<number>(0);

  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    ApiClient.getTopics()
      .then(res => setTopics(res.topics || []))
      .catch(err => console.error('Failed to load topics:', err));
  }, []);

  const selectedTopic = topics.find(t => t.id === topicId);
  const availableSubtopics = selectedTopic?.subtopics || [];

  const handleStartQuiz = async () => {
    setStarting(true);
    const finalCount = customCount ? parseInt(customCount, 10) : questionCount;

    try {
      const res = await ApiClient.createQuizSession({
        mode,
        topicId: topicId !== 'all' ? topicId : undefined,
        subtopicId: subtopicId !== 'all' ? subtopicId : undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        questionCount: finalCount,
        timeLimitSec: mode === 'test' ? timeLimitSec : 0
      });

      addToast({ type: 'success', message: 'Quiz session generated!' });
      navigate(`/quiz/${res.session.id}`);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to start quiz session' });
    } finally {
      setStarting(false);
    }
  };

  const modeDescriptions: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
    practice: {
      icon: <Brain size={22} />,
      label: 'Practice Mode',
      desc: 'Immediate feedback with explanation. Missed questions adaptively repeat later in the session.'
    },
    test: {
      icon: <FileCheck2 size={22} />,
      label: 'Test Exam Mode',
      desc: 'Answers are recorded without immediate feedback. Full results and score shown upon submission.'
    },
    mistakes: {
      icon: <RotateCcw size={22} />,
      label: 'Mistakes Review',
      desc: 'Focus exclusively on questions you previously answered incorrectly until mastered.'
    },
    weak_areas: {
      icon: <Target size={22} />,
      label: 'Weak Areas',
      desc: 'Automatically targets topics and subtopics with your lowest historical accuracy.'
    },
    bookmarks: {
      icon: <Bookmark size={22} />,
      label: 'Bookmarks Quiz',
      desc: 'Practice only questions you have specifically bookmarked during previous sessions.'
    },
    review: {
      icon: <Clock size={22} />,
      label: 'Spaced Repetition',
      desc: 'Questions currently due for active recall according to your personal retention curve.'
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Sliders size={24} style={{ color: 'var(--primary-light)' }} />
          <h1 style={{ fontSize: '1.85rem' }}>Quiz Configuration</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Choose your learning mode, topic focus, difficulty, and session length.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {/* Step 1: Mode Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label className="input-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
            1. Select Learning Mode
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(modeDescriptions).map(([key, val]) => (
              <button
                key={key}
                type="button"
                className="card card-interactive"
                style={{
                  padding: '1rem',
                  border: mode === key ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: mode === key ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
                onClick={() => setMode(key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: mode === key ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                  {val.icon}
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{val.label}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {val.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Topic & Subtopic */}
        <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="topic-select">2. Topic Filter</label>
            <select
              id="topic-select"
              className="select"
              value={topicId}
              onChange={e => {
                setTopicId(e.target.value);
                setSubtopicId('all');
              }}
            >
              <option value="all">All Topics (Comprehensive)</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.question_count} questions)</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="subtopic-select">Subtopic (Optional)</label>
            <select
              id="subtopic-select"
              className="select"
              value={subtopicId}
              onChange={e => setSubtopicId(e.target.value)}
              disabled={topicId === 'all'}
            >
              <option value="all">All Subtopics</option>
              {availableSubtopics.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.question_count})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 3: Difficulty & Count */}
        <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
          <div className="input-group">
            <label className="input-label">3. Difficulty</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  type="button"
                  className={`btn ${difficulty === d ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">4. Question Count</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[5, 10, 20, 50].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`btn ${questionCount === c && !customCount ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setQuestionCount(c);
                    setCustomCount('');
                  }}
                >
                  {c}
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom"
                className="input"
                style={{ width: '80px', minHeight: '36px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Test Mode Timer (if Test Mode chosen) */}
        {mode === 'test' && (
          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Optional Test Timer</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'No Timer', sec: 0 },
                { label: '5 Mins', sec: 300 },
                { label: '10 Mins', sec: 600 },
                { label: '15 Mins', sec: 900 },
                { label: '30 Mins', sec: 1800 }
              ].map(t => (
                <button
                  key={t.sec}
                  type="button"
                  className={`btn ${timeLimitSec === t.sec ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setTimeLimitSec(t.sec)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          onClick={handleStartQuiz}
          disabled={starting}
        >
          <Play size={20} />
          <span>{starting ? 'Generating Adaptive Quiz...' : 'Start Quiz Session'}</span>
        </button>
      </div>
    </div>
  );
};
