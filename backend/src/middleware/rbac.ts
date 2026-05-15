import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './errorHandler.js';
import type { UserRole } from '@prisma/client';

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.'));
    }
    if (req.user.role !== role) {
      return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions.'));
    }
    next();
  };
}
