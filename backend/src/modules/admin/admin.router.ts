import { Router } from 'express';
import { adminUsersRouter } from '../users/users.router.js';
import { adminInstitutionsRouter } from '../institutions/institutions.router.js';
import { adminComplaintsRouter } from '../complaints/complaints.router.js';
import { adminStatisticsRouter } from '../statistics/statistics.router.js';

const router = Router();

router.use(adminUsersRouter);
router.use(adminInstitutionsRouter);
router.use(adminComplaintsRouter);
router.use(adminStatisticsRouter);

export { router as adminRouter };
