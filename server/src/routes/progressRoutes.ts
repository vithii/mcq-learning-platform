import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

export const progressRouter = Router();

progressRouter.use(requireAuth);

// User dashboard metrics & recommendations
progressRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await AnalyticsService.getUserDashboard(req.user!.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard' });
  }
});

// Detailed analytics breakdown
progressRouter.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await AnalyticsService.getDetailedAnalytics(req.user!.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
  }
});

// Mistake review list
progressRouter.get('/mistakes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mistakes = await AnalyticsService.getMistakesList(req.user!.id);
    res.json({ mistakes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mistakes' });
  }
});
