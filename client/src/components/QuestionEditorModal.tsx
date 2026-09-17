import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ApiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2 } from 'lucide-react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: any | null;
  onSaved: () => void;
  topics: any[];
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  onSaved,
  topics
}) => {
  const { addToast } = useToast();

  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [options, setOptions] = useState<Array<{ key: string; text: string }>>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (questionToEdit) {
      setTopicId(questionToEdit.topic_id || '');
      setSubtopicId(questionToEdit.subtopic_id || '');
      setQuestionText(questionToEdit.question_text || '');
      setExplanation(questionToEdit.explanation || '');
      setDifficulty(questionToEdit.difficulty || 'medium');
      setCorrectAnswer(questionToEdit.correct_answer || 'A');
      if (questionToEdit.options && questionToEdit.options.length > 0) {
        setOptions(questionToEdit.options);
      }
    } else {
      // Default initial state
      if (topics.length > 0) {
        setTopicId(topics[0].id);
        if (topics[0].subtopics?.length > 0) {
          setSubtopicId(topics[0].subtopics[0].id);
        }
      }
      setQuestionText('');
      setExplanation('');
      setDifficulty('medium');
      setCorrectAnswer('A');
      setOptions([
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' }
      ]);
    }
  }, [questionToEdit, topics, isOpen]);

  const selectedTopic = topics.find(t => t.id === topicId);
  const availableSubtopics = selectedTopic?.subtopics || [];

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions(prev => {
      const next = [...prev];
      next[index].text = text;
      return next;
    });
  };

  const handleAddOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextKey = letters[options.length] || `OPT${options.length + 1}`;
    setOptions(prev => [...prev, { key: nextKey, text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      addToast({ type: 'error', message: 'A question must have at least 2 options' });
      return;
    }
    const removedKey = options[index].key;
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (correctAnswer === removedKey && next.length > 0) {
      setCorrectAnswer(next[0].key);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId || !subtopicId) {
      addToast({ type: 'error', message: 'Please select a topic and subtopic' });
      return;
    }
    if (options.some(o => !o.text.trim())) {
      addToast({ type: 'error', message: 'All option texts must be filled in' });
      return;
    }

    setSaving(true);
    try {
      if (questionToEdit) {
        await ApiClient.updateQuestion(questionToEdit.id, {
          topicId,
          subtopicId,
          questionText,
          explanation,
          difficulty,
          correctAnswer,
          options
        });
        addToast({ type: 'success', message: 'Question updated successfully!' });
      } else {
        await ApiClient.createQuestion({
          topicId,
          subtopicId,
          questionText,
          explanation,
          difficulty,
          correctAnswer,
          options
        });
        addToast({ type: 'success', message: 'Question created successfully!' });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to save question' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={questionToEdit ? 'Edit Question' : 'Create New Question'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        {/* Topic & Subtopic */}
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label" htmlFor="edit-topic">Topic</label>
            <select
              id="edit-topic"
              className="select"
              value={topicId}
              onChange={e => {
                setTopicId(e.target.value);
                const t = topics.find(x => x.id === e.target.value);
                if (t && t.subtopics?.length > 0) {
                  setSubtopicId(t.subtopics[0].id);
                } else {
                  setSubtopicId('');
                }
              }}
              required
            >
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="edit-subtopic">Subtopic</label>
            <select
              id="edit-subtopic"
              className="select"
              value={subtopicId}
              onChange={e => setSubtopicId(e.target.value)}
              required
            >
              {availableSubtopics.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Text */}
        <div className="input-group">
          <label className="input-label" htmlFor="edit-question-text">Question Text</label>
          <textarea
            id="edit-question-text"
            className="textarea"
            rows={3}
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            required
            placeholder="Type question prompt..."
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="input-label">Answer Options</label>
            <button
              type="button"
              onClick={handleAddOption}
              className="btn btn-secondary btn-sm"
              disabled={options.length >= 6}
            >
              <Plus size={14} />
              <span>Add Option</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {options.map((opt, i) => (
              <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: correctAnswer === opt.key ? 'var(--success)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {opt.key}
                </div>

                <input
                  type="text"
                  className="input"
                  style={{ flex: 1, minHeight: '40px', padding: '0.4rem 0.75rem' }}
                  placeholder={`Option ${opt.key} text`}
                  value={opt.text}
                  onChange={e => handleOptionTextChange(i, e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setCorrectAnswer(opt.key)}
                  className={`btn ${correctAnswer === opt.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  title="Mark as correct answer"
                >
                  {correctAnswer === opt.key ? '✓ Correct' : 'Set Correct'}
                </button>

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    className="btn-ghost"
                    style={{ padding: '6px', color: 'var(--danger)', cursor: 'pointer' }}
                    title="Remove option"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty & Explanation */}
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label" htmlFor="edit-diff">Difficulty Level</label>
            <select
              id="edit-diff"
              className="select"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as any)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="edit-correct-ans">Correct Answer Key</label>
            <select
              id="edit-correct-ans"
              className="select"
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
            >
              {options.map(o => (
                <option key={o.key} value={o.key}>Option {o.key}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="edit-explanation">Answer Explanation</label>
          <textarea
            id="edit-explanation"
            className="textarea"
            rows={2}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Explain why this answer is correct..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <span>{saving ? 'Saving...' : questionToEdit ? 'Save Changes' : 'Create Question'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
