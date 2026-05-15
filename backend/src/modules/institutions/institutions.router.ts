import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { listInstitutions, createInstitution, updateInstitution, deleteInstitution } from './institutions.service.js';
import { createInstitutionSchema, updateInstitutionSchema } from './institutions.schemas.js';
import { HttpError } from '../../middleware/errorHandler.js';

const publicRouter = Router();

publicRouter.get('/institutions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query['size'] as string) || 20));
    const category = (req.query['category'] as string) || undefined;
    const q = (req.query['q'] as string) || undefined;
    const result = await listInstitutions({ category, q, page, size });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const adminRouter = Router();

adminRouter.post(
  '/institutions',
  requireAuth,
  requireRole('admin'),
  validate(createInstitutionSchema),
  async (req, res, next) => {
    try {
      const inst = await createInstitution(req.body as { categoryId: string; name: string; email: string });
      res.status(201).json(inst);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.patch(
  '/institutions/:id',
  requireAuth,
  requireRole('admin'),
  validate(updateInstitutionSchema),
  async (req, res, next) => {
    try {
      const inst = await updateInstitution(req.params['id']!, req.body as { name?: string; email?: string; active?: boolean });
      res.json(inst);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.delete(
  '/institutions/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      if (!req.params['id']) throw new HttpError(400, 'VALIDATION_ERROR', 'ID required.');
      await deleteInstitution(req.params['id']);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { publicRouter as institutionsRouter, adminRouter as adminInstitutionsRouter };
