// src/middleware/auth.ts
import { type Request, type Response, type NextFunction } from 'express';

/**
 * Middleware to validate the internal API key.
 * Expected header: x-internal-key
 */
export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const internalKey = req.headers['x-internal-key'];
  const expectedKey = process.env.INTERNAL_KEY;

  if (!internalKey || internalKey !== expectedKey) {
    res.status(403).json({ error: 'Unauthorized: Invalid internal key' });
    return;
  }

  next();
}
