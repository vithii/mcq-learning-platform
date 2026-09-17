import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ImportService } from '../services/importService';
import { ExportService } from '../services/exportService';
import { QuestionService } from '../services/questionService';
import { execute, queryOne, queryAll } from '../db/database';

export const adminRouter = Router();

// Require admin for all routes in this router
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

const validateImportSchema = z.object({
  payload: z.union([z.string(), z.record(z.any())])
});

const executeImportSchema = z.object({
  filename: z.string().min(1),
  validatedRecords: z.array(z.any()).min(1),
  duplicateStrategy: z.enum(['update_existing', 'skip_duplicate', 'import_as_new'])
});

// 1. Validate & Preview JSON
adminRouter.post('/import/validate', validateBody(validateImportSchema), async (req: Request, res: Response) => {
  try {
    const result = await ImportService.validateAndPreview(req.body.payload);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Validation failed' });
  }
});

// 2. Execute Transactional Import
adminRouter.post('/import/execute', validateBody(executeImportSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, validatedRecords, duplicateStrategy } = req.body;
    const result = await ImportService.executeImport({
      adminUserId: req.user!.id,
      filename,
      validatedRecords,
      duplicateStrategy
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Import execution failed' });
  }
});

// 3. Import History
adminRouter.get('/import/history', async (req: Request, res: Response) => {
  try {
    const history = await ImportService.getImportHistory();
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch import history' });
  }
});

// 4. Export Canonical JSON
adminRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const { topicId, subtopicId, difficulty } = req.query;
    const data = await ExportService.exportCanonicalJSON({
      topicId: topicId as string,
      subtopicId: subtopicId as string,
      difficulty: difficulty as string
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="mcq_export.json"');
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// 5. Content Health Audit
adminRouter.get('/content-health', async (req: Request, res: Response) => {
  try {
    const health = await QuestionService.getContentHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to analyze content health' });
  }
});

// 6. Admin System-Wide Analytics (Section 29)
adminRouter.get('/analytics', async (req: Request, res: Response) => {
  try {
    const totalUsers = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users'))?.count || 0;
    const activeUsers = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE status = "active"'))?.count || 0;
    const totalTopics = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM topics'))?.count || 0;
    const totalSubtopics = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM subtopics'))?.count || 0;
    const totalQuestions = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM questions'))?.count || 0;
    const totalQuizzes = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM quiz_sessions WHERE status = "completed"'))?.count || 0;
    const totalAttempts = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM answer_attempts'))?.count || 0;
    const correctAttempts = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM answer_attempts WHERE is_correct = 1'))?.count || 0;

    const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    // Question distribution by topic
    const topicDist = await queryAll(`
      SELECT t.id, t.name, COUNT(q.id) as question_count
      FROM topics t
      LEFT JOIN questions q ON t.id = q.topic_id
      GROUP BY t.id
      ORDER BY question_count DESC
    `);

    // Question distribution by difficulty
    const diffDist = await queryAll(`
      SELECT difficulty, COUNT(*) as count
      FROM questions
      GROUP BY difficulty
    `);

    // Recent user registrations
    const recentUsers = await queryAll(`
      SELECT id, name, email, role, status, xp, level, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Recent imports
    const recentImports = await ImportService.getImportHistory();

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalTopics,
        totalSubtopics,
        totalQuestions,
        totalQuizzes,
        totalAttempts,
        overallAccuracy
      },
      topicDistribution: topicDist,
      difficultyDistribution: diffDist,
      recentUsers,
      recentImports: recentImports.slice(0, 5)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin analytics' });
  }
});

// 7. Users Management
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    let where: string[] = [];
    let args: any[] = [];

    if (search && String(search).trim()) {
      where.push('(name LIKE ? OR email LIKE ?)');
      args.push(`%${String(search).trim()}%`, `%${String(search).trim()}%`);
    }

    if (role && role !== 'all') {
      where.push('role = ?');
      args.push(role);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM users ${whereSql}`, args);
    const users = await queryAll(`
      SELECT id, name, email, role, status, xp, level, current_streak, longest_streak, created_at, last_login_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...args, Number(limit), offset]);

    res.json({
      users,
      total: countRow?.total || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

// 8. Update User Role or Status
adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const { role, status } = req.body;
    const user = await queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (status && !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Protect last active admin
    if (user.role === 'admin' && (role === 'user' || status === 'suspended')) {
      const adminCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "active"');
      if (adminCount && adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot demote or suspend the only active administrator' });
      }
    }

    await execute(`
      UPDATE users
      SET role = COALESCE(?, role),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `, [role || null, status || null, req.params.id]);

    const updated = await queryOne('SELECT id, name, email, role, status FROM users WHERE id = ?', [req.params.id]);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});
