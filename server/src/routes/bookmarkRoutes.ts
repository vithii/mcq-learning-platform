import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { execute, queryOne, queryAll } from '../db/database';

export const bookmarkRouter = Router();

bookmarkRouter.use(requireAuth);

// List bookmarks with question details
bookmarkRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await queryAll<{
      bookmark_id: string;
      question_id: string;
      bookmarked_at: string;
      question_text: string;
      explanation: string;
      difficulty: string;
      correct_answer: string;
      topic_name: string;
      subtopic_name: string;
      mastery_level: string;
    }>(`
      SELECT 
        b.id as bookmark_id, b.question_id, b.created_at as bookmarked_at,
        q.question_text, q.explanation, q.difficulty, q.correct_answer,
        t.name as topic_name, s.name as subtopic_name,
        COALESCE(uqp.mastery_level, 'NEW') as mastery_level
      FROM bookmarks b
      JOIN questions q ON b.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      LEFT JOIN user_question_progress uqp ON b.question_id = uqp.question_id AND uqp.user_id = b.user_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user!.id]);

    res.json({ bookmarks: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookmarks' });
  }
});

// Toggle or add bookmark
bookmarkRouter.post('/:questionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const question = await queryOne('SELECT id FROM questions WHERE id = ?', [req.params.questionId]);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const existing = await queryOne<{ id: string }>('SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?', [
      req.user!.id,
      req.params.questionId
    ]);

    if (existing) {
      await execute('DELETE FROM bookmarks WHERE id = ?', [existing.id]);
      await execute('UPDATE user_question_progress SET is_bookmarked = 0 WHERE user_id = ? AND question_id = ?', [
        req.user!.id,
        req.params.questionId
      ]);
      return res.json({ bookmarked: false, message: 'Bookmark removed' });
    } else {
      const bId = `bmk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await execute('INSERT INTO bookmarks (id, user_id, question_id) VALUES (?, ?, ?)', [
        bId,
        req.user!.id,
        req.params.questionId
      ]);
      await execute('UPDATE user_question_progress SET is_bookmarked = 1 WHERE user_id = ? AND question_id = ?', [
        req.user!.id,
        req.params.questionId
      ]);
      return res.json({ bookmarked: true, message: 'Question bookmarked' });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to toggle bookmark' });
  }
});

// Delete bookmark explicitly
bookmarkRouter.delete('/:questionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?', [req.user!.id, req.params.questionId]);
    await execute('UPDATE user_question_progress SET is_bookmarked = 0 WHERE user_id = ? AND question_id = ?', [
      req.user!.id,
      req.params.questionId
    ]);
    res.json({ success: true, message: 'Bookmark removed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete bookmark' });
  }
});
