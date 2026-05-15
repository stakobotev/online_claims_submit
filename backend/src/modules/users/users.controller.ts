import type { Request, Response, NextFunction } from 'express';
import { getMe, listUsers, updateUser, anonymizeUser, exportUserData } from './users.service.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { UserRole, UserStatus } from '@prisma/client';

export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const user = await getMe(req.user.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query['size'] as string) || 20));
    const q = (req.query['q'] as string) || undefined;
    const role = (req.query['role'] as UserRole) || undefined;
    const status = (req.query['status'] as UserStatus) || undefined;

    const result = await listUsers({ q, role, status, page, size });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { id } = req.params as { id: string };
    const body = req.body as { role?: UserRole; status?: UserStatus };
    const updated = await updateUser(id, body, req.user.sub);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function anonymizeUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { id } = req.params as { id: string };
    const result = await anonymizeUser(id, req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { id } = req.params as { id: string };
    const data = await exportUserData(id, req.user.sub);
    res.setHeader('Content-Disposition', `attachment; filename="user-${id}-export.json"`);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
