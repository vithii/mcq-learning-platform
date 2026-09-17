import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database';

export const JWT_SECRET = process.env.JWT_SECRET || 'mcq_learning_platform_super_secret_jwt_key_2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await queryOne<AuthUser>(
      'SELECT id, name, email, role, avatar_url, xp, level, current_streak, longest_streak, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
  }
  next();
}


export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
      const user = await queryOne<AuthUser>(
        'SELECT id, name, email, role, avatar_url, xp, level, current_streak, longest_streak, status FROM users WHERE id = ?',
        [decoded.id]
      );
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid tokens in optional auth
  }
  next();
}
