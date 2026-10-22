import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/responseFormatter.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired authentication token', 401);
  }
}
