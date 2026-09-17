import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { QuestionService } from '../services/questionService';

export const questionRouter = Router();

const questionSchema = z.object({
  topicId: z.string().min(1, 'Topic is required'),
  subtopicId: z.string().min(1, 'Subtopic is required'),
  questionText: z.string().min(5, 'Question text must be at least 5 characters'),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  externalId: z.string().optional(),
  options: z.array(z.object({
    key: z.string().min(1),
    text: z.string().min(1)
  })).min(2, 'Must provide at least 2 options')
});

const updateQuestionSchema = questionSchema.partial().extend({
  isActive: z.boolean().optional()
});

// List questions with search/filter/pagination
questionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      topicId,
      subtopicId,
      difficulty,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const result = await QuestionService.getQuestions({
      search: search as string,
      topicId: topicId as string,
      subtopicId: subtopicId as string,
      difficulty: difficulty as string,
      isActive: isActive as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc'
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch questions' });
  }
});

// Single question
questionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const q = await QuestionService.getQuestionById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json({ question: q });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch question' });
  }
});

// Create question (Admin)
questionRouter.post('/', requireAuth, requireAdmin, validateBody(questionSchema), async (req: Request, res: Response) => {
  try {
    const created = await QuestionService.createQuestion(req.body);
    res.status(201).json({ question: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create question' });
  }
});

// Update question (Admin)
questionRouter.patch('/:id', requireAuth, requireAdmin, validateBody(updateQuestionSchema), async (req: Request, res: Response) => {
  try {
    const updated = await QuestionService.updateQuestion(req.params.id, req.body);
    res.json({ question: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update question' });
  }
});


const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).optional(),
  filter: z.object({
    topicId: z.string().optional(),
    subtopicId: z.string().optional(),
    search: z.string().optional(),
    difficulty: z.string().optional()
  }).optional()
});

// Bulk Delete Questions (Admin)
questionRouter.post('/bulk-delete', requireAuth, requireAdmin, validateBody(bulkDeleteSchema), async (req: Request, res: Response) => {
  try {
    const { ids, filter } = req.body;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await QuestionService.bulkDeleteQuestions(ids);
      return res.json(result);
    }
    if (filter) {
      const result = await QuestionService.deleteQuestionsByFilter(filter);
      return res.json(result);
    }
    res.status(400).json({ error: 'Either "ids" or "filter" must be provided' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Bulk deletion failed' });
  }
});

// Delete question (Admin)
questionRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await QuestionService.deleteQuestion(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete question' });

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).optional(),
  filter: z.object({
    topicId: z.string().optional(),
    subtopicId: z.string().optional(),
    search: z.string().optional(),
    difficulty: z.string().optional()
  }).optional()
});

// Bulk Delete Questions (Admin)
questionRouter.post('/bulk-delete', requireAuth, requireAdmin, validateBody(bulkDeleteSchema), async (req: Request, res: Response) => {
  try {
    const { ids, filter } = req.body;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await QuestionService.bulkDeleteQuestions(ids);
      return res.json(result);
    }
    if (filter) {
      const result = await QuestionService.deleteQuestionsByFilter(filter);
      return res.json(result);
    }
    res.status(400).json({ error: 'Either "ids" or "filter" must be provided' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Bulk deletion failed' });
  }
});

  }
});
