
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
});

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { runAllSeeds } from './db/seed';

import { authRouter } from './routes/authRoutes';
import { topicRouter } from './routes/topicRoutes';
import { questionRouter } from './routes/questionRoutes';
import { quizRouter } from './routes/quizRoutes';
import { progressRouter } from './routes/progressRoutes';
import { bookmarkRouter } from './routes/bookmarkRoutes';
import { leaderboardRouter } from './routes/leaderboardRoutes';
import { adminRouter } from './routes/adminRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' })); // Support JSON uploads up to 15MB
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging in dev
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check and API Routes
const apiRouter = express.Router();

apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'Adaptive MCQ Learning Platform' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/topics', topicRouter);
apiRouter.use('/questions', questionRouter);
apiRouter.use('/quizzes', quizRouter);
apiRouter.use('/progress', progressRouter);
apiRouter.use('/bookmarks', bookmarkRouter);
apiRouter.use('/leaderboard', leaderboardRouter);
apiRouter.use('/admin', adminRouter);

// Support both standard /api prefix and Netlify function redirect prefixes
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

// Serve static frontend in production (when run as standalone server)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
}

// 404 for unknown API routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

// SPA fallback for frontend client routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Adaptive MCQ Platform API</title></head>
          <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
            <h1>Adaptive MCQ Learning Platform Server</h1>
            <p>API is running. Frontend dev server is available on Vite (default port 5173).</p>
            <p>Health check: <a href="/api/health" style="color: #38bdf8;">/api/health</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Centralized error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected internal error occurred';
  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
});

// Singleton database initializer
let initPromise: Promise<void> | null = null;
export async function ensureDatabaseInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await initDatabase();
      await runAllSeeds();
    })();
  }
  return initPromise;
}

// Server bootstrapper
async function startServer() {
  try {
    await ensureDatabaseInitialized();

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(` Adaptive MCQ Learning Platform Server is running!`);
      console.log(` Server URL: http://localhost:${PORT}`);
      console.log(` API Health: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app, startServer };

