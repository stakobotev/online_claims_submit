import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { meHandler, listUsersHandler, updateUserHandler, anonymizeUserHandler, exportUserHandler } from './users.controller.js';
import { updateUserAdminSchema } from './users.schemas.js';

const router = Router();

router.get('/me', requireAuth, meHandler);

const adminRouter = Router();
adminRouter.get('/users', requireAuth, requireRole('admin'), listUsersHandler);
adminRouter.patch('/users/:id', requireAuth, requireRole('admin'), validate(updateUserAdminSchema), updateUserHandler);
adminRouter.post('/users/:id/anonymize', requireAuth, requireRole('admin'), anonymizeUserHandler);
adminRouter.get('/users/:id/export', requireAuth, requireRole('admin'), exportUserHandler);

export { router as usersRouter, adminRouter as adminUsersRouter };
