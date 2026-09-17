import React, { useEffect, useState, useCallback } from 'react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { QuestionEditorModal } from '../../components/QuestionEditorModal';
import {
  HelpCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';

export const QuestionManagerPage: React.FC = () => {
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [topicId, setTopicId] = useState('all');
  const [subtopicId, setSubtopicId] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [isActive, setIsActive] = useState('all');

  const [topics, setTopics] = useState<any[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Multi-select and Bulk Deletion
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // One-Click Set Deletion Modal
  const [confirmSetModalOpen, setConfirmSetModalOpen] = useState(false);

  // Load topics for filter dropdown
  const loadTopics = useCallback(() => {
    ApiClient.getTopics()
      .then(res => setTopics(res.topics || []))
      .catch(err => console.error('Failed to load topics:', err));
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const selectedTopic = topics.find(t => t.id === topicId);
  const availableSubtopics = selectedTopic?.subtopics || [];
  const selectedSubtopic = availableSubtopics.find((s: any) => s.id === subtopicId);

  const fetchQuestions = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await ApiClient.getQuestions({
        search,
        topicId: topicId !== 'all' ? topicId : undefined,
        subtopicId: subtopicId !== 'all' ? subtopicId : undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        isActive: isActive !== 'all' ? isActive : undefined,
        page: p,
        limit: 15
      });
      setQuestions(res.questions || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load questions' });
    } finally {
      setLoading(false);
    }
  }, [search, topicId, subtopicId, difficulty, isActive, addToast]);

  useEffect(() => {
    fetchQuestions(page);
  }, [fetchQuestions, page]);

  // Single Question Delete
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await ApiClient.deleteQuestion(id);
      addToast({ type: 'success', message: 'Question deleted successfully' });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchQuestions(page);
      loadTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete question' });
    }
  };

  // Multi-select Toggle for Single Row
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/Deselect All on Current Page
  const isPageAllSelected = questions.length > 0 && questions.every(q => selectedIds.has(q.id));
  const handleToggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isPageAllSelected) {
        questions.forEach(q => next.delete(q.id));
      } else {
        questions.forEach(q => next.add(q.id));
      }
      return next;
    });
  };

  // Execute Bulk Delete for Selected Checkbox Items
  const handleBulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected question(s)?`)) return;

    setDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const res = await ApiClient.bulkDeleteQuestions(idsArray);
      addToast({ type: 'success', message: `Successfully deleted ${res.count || count} questions` });
      setSelectedIds(new Set());
      fetchQuestions(page);
      loadTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete selected questions' });
    } finally {
      setDeleting(false);
    }
  };

  // Execute One-Click Set Deletion (Filter-based)
  const handleExecuteSetDelete = async () => {
    if (total === 0) return;
    setDeleting(true);
    try {
      const res = await ApiClient.deleteQuestionsByFilter({
        topicId: topicId !== 'all' ? topicId : undefined,
        subtopicId: subtopicId !== 'all' ? subtopicId : undefined,
        search: search.trim() || undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined
      });
      addToast({ type: 'success', message: `Successfully deleted ${res.count || total} questions in this set` });
      setConfirmSetModalOpen(false);
      setSelectedIds(new Set());
      setPage(1);
      fetchQuestions(1);
      loadTopics();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete question set' });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (q: any) => {
    try {
      await ApiClient.updateQuestion(q.id, { isActive: !q.is_active });
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_active: !q.is_active } : item));
      addToast({ type: 'info', message: `Question ${q.is_active ? 'deactivated' : 'activated'}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to toggle status' });
    }
  };

  const isSetFilterActive = topicId !== 'all' || subtopicId !== 'all' || search.trim().length > 0;

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <HelpCircle size={24} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Question Bank Manager</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Search, edit, author, and manage questions. Total in database: {total} matching.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* One-Click Delete Set Button (active when filtered or focused) */}
          {isSetFilterActive && total > 0 && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setConfirmSetModalOpen(true)}
              disabled={deleting}
              title="Delete all questions matching the current topic, subtopic, or search"
            >
              <Trash2 size={16} />
              <span>Delete Set ({total})</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingQuestion(null);
              setEditorOpen(true);
            }}
          >
            <Plus size={18} />
            <span>New Question</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search questions..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Topic Filter */}
          <select
            className="select"
            value={topicId}
            onChange={e => {
              setTopicId(e.target.value);
              setSubtopicId('all');
              setPage(1);
            }}
          >
            <option value="all">All Topics</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.question_count})</option>
            ))}
          </select>

          {/* Subtopic Filter */}
          <select
            className="select"
            value={subtopicId}
            onChange={e => {
              setSubtopicId(e.target.value);
              setPage(1);
            }}
            disabled={topicId === 'all'}
          >
            <option value="all">All Subtopics</option>
            {availableSubtopics.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.question_count})</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            className="select"
            value={difficulty}
            onChange={e => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when questions are selected */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.25rem',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid var(--primary, #6366f1)',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              ✓ {selectedIds.size} question{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </button>
          </div>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleBulkDeleteSelected}
            disabled={deleting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={16} />
            <span>Delete Selected ({selectedIds.size})</span>
          </button>
        </div>
      )}

      {/* Questions Table */}
      {loading && questions.length === 0 ? (
        <LoadingSkeleton rows={6} />
      ) : questions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-dim)' }}>
          No questions match your current search or filter criteria.
        </div>
      ) : (
        <div className="card" style={{ padding: '0.5rem 0' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isPageAllSelected}
                      onChange={handleToggleSelectAllPage}
                      title="Select all on this page"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th>Question Prompt</th>
                  <th>Topic / Subtopic</th>
                  <th>Difficulty</th>
                  <th>Correct</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map(q => {
                  const isSelected = selectedIds.has(q.id);
                  return (
                    <tr
                      key={q.id}
                      style={{
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(q.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>

                      <td style={{ maxWidth: '340px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {q.question_text}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          ID: {q.external_id || q.id}
                        </div>
                      </td>

                      <td>
                        <div><strong>{q.topic_name}</strong></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{q.subtopic_name}</div>
                      </td>

                      <td>
                        <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`} style={{ textTransform: 'capitalize' }}>
                          {q.difficulty}
                        </span>
                      </td>

                      <td>
                        <span className="badge badge-success">
                          Option {q.correct_answer}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(q)}
                          className={`badge ${q.is_active ? 'badge-success' : 'badge-danger'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Click to toggle active state"
                        >
                          {q.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px' }}
                            onClick={() => {
                              setEditingQuestion(q);
                              setEditorOpen(true);
                            }}
                            title="Edit Question"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '6px', color: 'var(--danger)', cursor: 'pointer' }}
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Delete Question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                Page {page} of {totalPages} ({total} total questions)
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Question Modal */}
      {editorOpen && (
        <QuestionEditorModal
          isOpen={editorOpen}
          questionToEdit={editingQuestion}
          topics={topics}
          onClose={() => {
            setEditorOpen(false);
            setEditingQuestion(null);
          }}
          onSaved={() => {
            setEditorOpen(false);
            setEditingQuestion(null);
            fetchQuestions(page);
            loadTopics();
          }}
        />
      )}

      {/* One-Click Set Deletion Confirmation Modal */}
      {confirmSetModalOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmSetModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={28} />
              <h2 style={{ fontSize: '1.4rem' }}>Delete Entire Question Set?</h2>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              You are about to permanently delete <strong>{total} questions</strong> matching the following criteria:
            </p>

            <div style={{ background: 'var(--surface-elevated, rgba(255,255,255,0.04))', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              {selectedTopic && <div><strong>Topic:</strong> {selectedTopic.name}</div>}
              {selectedSubtopic && <div><strong>Subtopic:</strong> {selectedSubtopic.name}</div>}
              {search.trim() && <div><strong>Search keyword:</strong> "{search.trim()}"</div>}
              {difficulty !== 'all' && <div><strong>Difficulty:</strong> {difficulty}</div>}
              <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontWeight: 600 }}>
                Total Questions to Erase: {total}
              </div>
            </div>

            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              ⚠️ WARNING: This operation will permanently remove these questions and cascade delete all their options, learner progress, and attempt records. This cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmSetModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleExecuteSetDelete}
                disabled={deleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} />
                <span>{deleting ? 'Deleting...' : `Permanently Delete All ${total} Questions`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
