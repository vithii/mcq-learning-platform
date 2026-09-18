import React, { useEffect, useState } from 'react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Modal } from '../../components/Modal';
import { useCrossTabSync } from '../../services/syncService';
import { FolderTree, Plus, Edit2, Trash2, Layers, AlertTriangle, CheckSquare, Square } from 'lucide-react';

export const TopicManagerPage: React.FC = () => {
  const { addToast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-selection state for Bulk Delete / Select All
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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
      const list = res?.topics || (Array.isArray(res) ? res : []);
      setTopics(list);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load topics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  useCrossTabSync(['topics', 'questions', 'all'], () => {
    fetchTopics();
  });

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

  const handleDeleteSubtopic = async (topicId: string, subtopicId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete subtopic "${name}" and all its questions?`)) return;
    try {
      await ApiClient.deleteSubtopic(topicId, subtopicId);
      addToast({ type: 'success', message: 'Subtopic deleted' });
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete subtopic' });
    }
  };

  const handleEmptyAllTopics = async () => {
    if (!window.confirm('Are you sure you want to completely delete ALL topics, subtopics, and questions? This will wipe the topic organizer.')) return;
    try {
      await ApiClient.emptyQuestionBank();
      addToast({ type: 'success', message: 'All topics and questions have been completely removed.' });
      setSelectedTopicIds(new Set());
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete all topics' });
    }
  };

  const isAllSelected = topics.length > 0 && topics.every(t => selectedTopicIds.has(t.id));

  const handleToggleTopicSelect = (id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(topics.map(t => t.id)));
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedTopicIds.size === 0) return;
    const count = selectedTopicIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected topic(s) and all their subtopics and questions?`)) return;

    setDeleting(true);
    try {
      await ApiClient.bulkDeleteTopics(Array.from(selectedTopicIds));
      addToast({ type: 'success', message: `Successfully deleted ${count} topic(s)` });
      setSelectedTopicIds(new Set());
      fetchTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete selected topics' });
    } finally {
      setDeleting(false);
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

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {topics.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyAllTopics}
              className="btn btn-danger btn-sm"
              title="Completely delete all topics and subtopics"
            >
              <Trash2 size={16} />
              <span>Clear All Topics</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTopicModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>New Topic</span>
          </button>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
          <FolderTree size={40} style={{ margin: '0 auto 1rem', opacity: 0.35, color: 'var(--primary-light)' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>No Topics Found</h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            No topics exist yet. Create a topic hierarchy or load the default question bank.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTopicModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Create Topic</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await ApiClient.restoreDefaultQuestionBank();
                  addToast({ type: 'success', message: 'Default topics and questions restored!' });
                  fetchTopics();
                } catch (err: any) {
                  addToast({ type: 'error', message: err.message || 'Failed to restore' });
                }
              }}
              className="btn btn-secondary"
            >
              <span>Restore Default Questions</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Select All & Bulk Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="btn-ghost"
                style={{
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: isAllSelected ? 'var(--primary-light)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                title={isAllSelected ? 'Deselect all' : 'Select all'}
              >
                {isAllSelected ? (
                  <CheckSquare size={20} style={{ color: 'var(--primary-light)' }} />
                ) : (
                  <Square size={20} />
                )}
              </button>
              <span
                onClick={handleToggleSelectAll}
                style={{ fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', userSelect: 'none' }}
              >
                Select All Topics ({topics.length})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {selectedTopicIds.size > 0 ? (
                <>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    <strong>{selectedTopicIds.size}</strong> of {topics.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkDeleteSelected}
                    disabled={deleting}
                    className="btn btn-danger btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={16} />
                    <span>{deleting ? 'Deleting...' : `Delete Selected (${selectedTopicIds.size})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTopicIds(new Set())}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Deselect
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Check topics to select or click Select All
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {topics.map(t => (
            <div
              key={t.id}
              className="card"
              style={{
                border: selectedTopicIds.has(t.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: selectedTopicIds.has(t.id) ? 'rgba(99, 102, 241, 0.04)' : undefined,
                transition: 'border 0.15s ease, background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTopicSelect(t.id)}
                    className="btn-ghost"
                    style={{
                      padding: '4px',
                      marginTop: '2px',
                      color: selectedTopicIds.has(t.id) ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title={selectedTopicIds.has(t.id) ? 'Deselect topic' : 'Select topic'}
                  >
                    {selectedTopicIds.has(t.id) ? (
                      <CheckSquare size={20} style={{ color: 'var(--primary-light)' }} />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{t.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.description || 'No description'}</p>
                  </div>
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
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtopic(t.id, sub.id, sub.name)}
                      className="btn-ghost"
                      style={{ color: 'var(--danger)', padding: '4px' }}
                      title={`Delete subtopic "${sub.name}"`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        </div>
        </>
      )}

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
