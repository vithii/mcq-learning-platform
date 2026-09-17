import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const hitMap = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hitMap.entries()) {
    if (val.resetAt <= now) {
      hitMap.delete(key);
    }
  }
}, 60000);

export function createRateLimiter(options: {
  windowMs: number;
  maxHits: number;
  message?: string;
}) {
  const { windowMs, maxHits, message = 'Too many requests. Please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl}${req.path}_${ip}`;
    const now = Date.now();

    const record = hitMap.get(key);

    if (!record || record.resetAt <= now) {
      hitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > maxHits) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec
      });
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxHits: 25,              // max 25 attempts per 15 min
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
});
