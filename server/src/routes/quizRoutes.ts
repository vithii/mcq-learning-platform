import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { QuizEngine } from '../services/quizEngine';
import { queryAll, queryOne } from '../db/database';

export const quizRouter = Router();

quizRouter.use(requireAuth);

const createQuizSchema = z.object({
  mode: z.enum(['practice', 'test', 'mistakes', 'weak_areas', 'bookmarks', 'review']),
  topicId: z.string().optional(),
  subtopicId: z.string().optional(),
  difficulty: z.enum(['all', 'easy', 'medium', 'hard']).optional(),
  questionCount: z.number().int().min(1).max(100).optional(),
  timeLimitSec: z.number().int().min(0).max(7200).optional()
});

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.string().min(1),
  responseTimeMs: z.number().int().min(0).optional()
});

// Check for active resumable quiz session
quizRouter.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const active = await QuizEngine.getActiveSession(req.user!.id);
    res.json({ activeSession: active });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check active quiz session' });
  }
});

// Create new quiz session
quizRouter.post('/', validateBody(createQuizSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionState = await QuizEngine.createSession({
      userId: req.user!.id,
      mode: req.body.mode,
      topicId: req.body.topicId,
      subtopicId: req.body.subtopicId,
      difficulty: req.body.difficulty,
      questionCount: req.body.questionCount || 10,
      timeLimitSec: req.body.timeLimitSec || 0
    });
    res.status(201).json(sessionState);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create quiz session' });
  }
});

// Quiz history list
quizRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const totalRow = await queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM quiz_sessions WHERE user_id = ? AND status = "completed"',
      [req.user!.id]
    );

    const rows = await queryAll<{
      id: string;
      mode: string;
      topic_id: string;
      difficulty: string;
      question_limit: number;
      started_at: string;
      completed_at: string;
      score: number;
      accuracy: number;
      topic_name: string;
    }>(`
      SELECT 
        qs.*,
        COALESCE(t.name, 'All Topics') as topic_name
      FROM quiz_sessions qs
      LEFT JOIN topics t ON qs.topic_id = t.id
      WHERE qs.user_id = ? AND qs.status = 'completed'
      ORDER BY qs.completed_at DESC
      LIMIT ? OFFSET ?
    `, [req.user!.id, Number(limit), offset]);

    res.json({
      history: rows,
      total: totalRow?.total || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

// Single session state
quizRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionState = await QuizEngine.getSessionState(req.params.id, req.user!.id);
    res.json(sessionState);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Quiz session not found' });
  }
});

// Submit answer
quizRouter.post('/:id/answer', validateBody(submitAnswerSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await QuizEngine.submitAnswer({
      sessionId: req.params.id,
      userId: req.user!.id,
      questionId: req.body.questionId,
      selectedOption: req.body.selectedOption,
      responseTimeMs: req.body.responseTimeMs || 3000
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit answer' });
  }
});

// Complete session (for test mode submission)
quizRouter.post('/:id/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await QuizEngine.finalizeSession(req.params.id, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to complete quiz' });
  }
});

// Discard session
quizRouter.post('/:id/discard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await QuizEngine.discardSession(req.params.id, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to discard session' });
  }
});

// Results view
quizRouter.get('/:id/results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results = await QuizEngine.getSessionResults(req.params.id, req.user!.id);
    res.json(results);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Failed to fetch quiz results' });
  }
});
