import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { execute, queryOne, queryAll } from '../db/database';
import { requireAuth, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { QuestionService } from '../services/questionService';

export const topicRouter = Router();

const topicSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  sort_order: z.number().int().optional()
});

const subtopicSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  sort_order: z.number().int().optional()
});

// List topics with subtopics and question count
topicRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const topics = await QuestionService.getTopicsWithDetails(req.user?.id);
    res.json({ topics });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch topics' });
  }
});

// Single topic
topicRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const topic = await queryOne('SELECT * FROM topics WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const userId = req.user?.id;
    let subtopics: any[];

    if (userId) {
      subtopics = await queryAll(`
        SELECT 
          s.*,
          COUNT(q.id) as question_count,
          COUNT(CASE WHEN uqp.attempts > 0 THEN 1 END) as attempted_count,
          COUNT(CASE WHEN uqp.mastery_level = 'MASTERED' THEN 1 END) as mastered_count,
          COUNT(CASE WHEN uqp.mastery_level = 'LEARNING' THEN 1 END) as learning_count,
          COUNT(CASE WHEN uqp.mastery_level = 'REVIEWING' THEN 1 END) as reviewing_count,
          COALESCE(SUM(uqp.correct_count), 0) as total_correct,
          COALESCE(SUM(uqp.attempts), 0) as total_attempts
        FROM subtopics s
        LEFT JOIN questions q ON s.id = q.subtopic_id AND q.is_active = 1
        LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
        WHERE s.topic_id = ?
        GROUP BY s.id
        ORDER BY s.sort_order, s.name
      `, [userId, topic.id]);
    } else {
      subtopics = await queryAll(`
        SELECT 
          s.*,
          COUNT(q.id) as question_count,
          0 as attempted_count,
          0 as mastered_count,
          0 as learning_count,
          0 as reviewing_count,
          0 as total_correct,
          0 as total_attempts
        FROM subtopics s
        LEFT JOIN questions q ON s.id = q.subtopic_id AND q.is_active = 1
        WHERE s.topic_id = ?
        GROUP BY s.id
        ORDER BY s.sort_order, s.name
      `, [topic.id]);
    }

    const enrichedSubtopics = subtopics.map(st => {
      const qCount = Number(st.question_count) || 0;
      const attempted = Number(st.attempted_count) || 0;
      const mastered = Number(st.mastered_count) || 0;
      const totalAttempts = Number(st.total_attempts) || 0;
      const totalCorrect = Number(st.total_correct) || 0;

      return {
        ...st,
        question_count: qCount,
        attempted_count: attempted,
        mastered_count: mastered,
        progress_percent: qCount > 0 ? Math.min(100, Math.round((attempted / qCount) * 100)) : 0,
        mastery_percent: qCount > 0 ? Math.min(100, Math.round((mastered / qCount) * 100)) : 0,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null
      };
    });

    const totalQuestions = enrichedSubtopics.reduce((sum, s) => sum + s.question_count, 0);
    const totalAttempted = enrichedSubtopics.reduce((sum, s) => sum + s.attempted_count, 0);
    const totalMastered = enrichedSubtopics.reduce((sum, s) => sum + s.mastered_count, 0);

    res.json({
      topic: {
        ...topic,
        question_count: totalQuestions,
        attempted_count: totalAttempted,
        mastered_count: totalMastered,
        progress_percent: totalQuestions > 0 ? Math.min(100, Math.round((totalAttempted / totalQuestions) * 100)) : 0,
        mastery_percent: totalQuestions > 0 ? Math.min(100, Math.round((totalMastered / totalQuestions) * 100)) : 0,
        subtopics: enrichedSubtopics
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch topic' });
  }
});

// Create topic (Admin)
topicRouter.post('/', requireAuth, requireAdmin, validateBody(topicSchema), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, sort_order = 0 } = req.body;
    const finalSlug = (slug || name).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const id = finalSlug;

    await execute(
      'INSERT INTO topics (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), finalSlug, description || '', sort_order]
    );

    const created = await queryOne('SELECT * FROM topics WHERE id = ?', [id]);
    res.status(201).json({ topic: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create topic' });
  }
});

// Update topic (Admin)
topicRouter.patch('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, sort_order, is_active } = req.body;
    const existing = await queryOne('SELECT * FROM topics WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Topic not found' });

    await execute(`
      UPDATE topics
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ?
    `, [name, description, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id]);

    const updated = await queryOne('SELECT * FROM topics WHERE id = ?', [req.params.id]);
    res.json({ topic: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update topic' });
  }
});

// Delete topic (Admin) - Cascade deletes all dependent subtopics and questions
topicRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM topics WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Topic not found' });

    const id = req.params.id;
    // Explicitly delete child questions & progress to avoid foreign key blocks
    await execute('DELETE FROM quiz_questions WHERE question_id IN (SELECT id FROM questions WHERE topic_id = ?)', [id]);
    await execute('DELETE FROM user_question_progress WHERE question_id IN (SELECT id FROM questions WHERE topic_id = ?)', [id]);
    await execute('DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE topic_id = ?)', [id]);
    await execute('DELETE FROM questions WHERE topic_id = ?', [id]);
    await execute('DELETE FROM subtopics WHERE topic_id = ?', [id]);
    await execute('DELETE FROM topics WHERE id = ?', [id]);

    res.json({ success: true, message: 'Topic and associated subtopics/questions deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete topic' });
  }
});

// Delete subtopic (Admin) - Cascade deletes subtopic questions
topicRouter.delete('/:topicId/subtopics/:subtopicId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { subtopicId } = req.params;
    const existing = await queryOne('SELECT id FROM subtopics WHERE id = ?', [subtopicId]);
    if (!existing) return res.status(404).json({ error: 'Subtopic not found' });

    await execute('DELETE FROM quiz_questions WHERE question_id IN (SELECT id FROM questions WHERE subtopic_id = ?)', [subtopicId]);
    await execute('DELETE FROM user_question_progress WHERE question_id IN (SELECT id FROM questions WHERE subtopic_id = ?)', [subtopicId]);
    await execute('DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE subtopic_id = ?)', [subtopicId]);
    await execute('DELETE FROM questions WHERE subtopic_id = ?', [subtopicId]);
    await execute('DELETE FROM subtopics WHERE id = ?', [subtopicId]);

    res.json({ success: true, message: 'Subtopic and associated questions deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete subtopic' });
  }
});

// Create subtopic (Admin)
topicRouter.post('/:topicId/subtopics', requireAuth, requireAdmin, validateBody(subtopicSchema), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, sort_order = 0 } = req.body;
    const topic = await queryOne('SELECT id FROM topics WHERE id = ?', [req.params.topicId]);
    if (!topic) return res.status(404).json({ error: 'Parent topic not found' });

    const finalSlug = (slug || name).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const id = `${topic.id}-${finalSlug}`;

    await execute(
      'INSERT INTO subtopics (id, topic_id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, topic.id, name.trim(), finalSlug, description || '', sort_order]
    );

    const created = await queryOne('SELECT * FROM subtopics WHERE id = ?', [id]);
    res.status(201).json({ subtopic: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create subtopic' });
  }
});
