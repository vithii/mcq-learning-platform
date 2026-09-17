import React, { useEffect, useState } from 'react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Modal } from '../../components/Modal';
import { FolderTree, Plus, Edit2, Trash2, Layers } from 'lucide-react';

export const TopicManagerPage: React.FC = () => {
  const { addToast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Topic Modal
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');

  // New Subtopic Modal
  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [parentTopicId, setParentTopicId] = useState('');
  const [subtopicName, setSubtopicName] = useState('');
  const [subtopicDesc, setSubtopicDesc] = useState('');

  const fetchTopics = async () => {
    try {
      const res = await ApiClient.getTopics();
      setTopics(res.topics || []);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load topics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createTopic({ name: topicName, description: topicDesc });
      addToast({ type: 'success', message: 'Topic created successfully' });
      setTopicModalOpen(false);
      setTopicName('');
      setTopicDesc('');
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create topic' });
    }
  };

  const handleCreateSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createSubtopic(parentTopicId, { name: subtopicName, description: subtopicDesc });
      addToast({ type: 'success', message: 'Subtopic created successfully' });
      setSubtopicModalOpen(false);
      setSubtopicName('');
      setSubtopicDesc('');
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create subtopic' });
    }
  };

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete topic "${name}" and all its subtopics and questions?`)) return;
    try {
      await ApiClient.deleteTopic(id);
      addToast({ type: 'success', message: 'Topic deleted' });
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete topic' });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <FolderTree size={24} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Topic Organization</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Organize high-level categories and subtopic hierarchies for quizzes and analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTopicModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>New Topic</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {topics.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{t.name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.description || 'No description'}</p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setParentTopicId(t.id);
                    setSubtopicModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} />
                  <span>Add Subtopic</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTopic(t.id, t.name)}
                  className="btn-ghost"
                  style={{ color: 'var(--danger)', padding: '6px' }}
                  title="Delete Topic"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Subtopics */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Subtopics ({t.subtopics?.length || 0})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {t.subtopics?.map((sub: any) => (
                  <div
                    key={sub.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sub.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{sub.question_count} questions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Topic Modal */}
      <Modal isOpen={topicModalOpen} onClose={() => setTopicModalOpen(false)} title="Create New Topic">
        <form onSubmit={handleCreateTopic}>
          <div className="input-group">
            <label className="input-label" htmlFor="topic-name-input">Topic Name</label>
            <input
              id="topic-name-input"
              type="text"
              className="input"
              value={topicName}
              onChange={e => setTopicName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Physics"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="topic-desc-input">Description</label>
            <textarea
              id="topic-desc-input"
              className="textarea"
              rows={3}
              value={topicDesc}
              onChange={e => setTopicDesc(e.target.value)}
              placeholder="Brief overview of the subject..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setTopicModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Topic
            </button>
          </div>
        </form>
      </Modal>

      {/* New Subtopic Modal */}
      <Modal isOpen={subtopicModalOpen} onClose={() => setSubtopicModalOpen(false)} title="Add Subtopic">
        <form onSubmit={handleCreateSubtopic}>
          <div className="input-group">
            <label className="input-label" htmlFor="subtopic-name-input">Subtopic Name</label>
            <input
              id="subtopic-name-input"
              type="text"
              className="input"
              value={subtopicName}
              onChange={e => setSubtopicName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Quantum Mechanics"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="subtopic-desc-input">Description</label>
            <textarea
              id="subtopic-desc-input"
              className="textarea"
              rows={3}
              value={subtopicDesc}
              onChange={e => setSubtopicDesc(e.target.value)}
              placeholder="Subtopic focus..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setSubtopicModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Subtopic
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
