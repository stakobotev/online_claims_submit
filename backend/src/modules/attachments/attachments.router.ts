import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { streamAttachment } from './attachments.service.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router = Router();

router.get('/attachments/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { id } = req.params as { id: string };
    const isAdmin = req.user.role === 'admin';
    await streamAttachment(id, req.user.sub, isAdmin, res, {
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    next(err);
  }
});

export { router as attachmentsRouter };
