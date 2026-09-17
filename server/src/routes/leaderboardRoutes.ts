import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

leaderboardRouter.get('/:timeframe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeframe = req.params.timeframe as 'global' | 'weekly' | 'monthly';
    if (!['global', 'weekly', 'monthly'].includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe. Use global, weekly, or monthly.' });
    }

    const data = await AnalyticsService.getLeaderboard(req.user!.id, timeframe);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
});
