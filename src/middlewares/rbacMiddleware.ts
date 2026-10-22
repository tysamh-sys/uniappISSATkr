import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/responseFormatter.js';

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions', 403);
    }

    next();
  };
}
