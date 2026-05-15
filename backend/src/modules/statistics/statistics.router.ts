import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getPublicSummary, getAdminDetail, getExportData } from './statistics.service.js';
import { generateCsv } from '../../lib/csv.js';
import { streamPdf } from '../../lib/pdf.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router = Router();
const adminRouter = Router();

router.get('/statistics/summary', async (_req, res, next) => {
  try {
    const summary = await getPublicSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/statistics/detail', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const from = (req.query['from'] as string) || undefined;
    const to = (req.query['to'] as string) || undefined;
    const detail = await getAdminDetail({ from, to });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/statistics/export', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const format = (req.query['format'] as string) || 'csv';
    const from = (req.query['from'] as string) || undefined;
    const to = (req.query['to'] as string) || undefined;
    const data = await getExportData({ from, to });

    const rows = data.map((r) => ({
      publicId: r.publicId,
      status: r.status,
      categoryId: r.categoryId,
      submissionType: r.submissionType,
      urgent: r.urgent,
      createdAt: r.createdAt.toISOString(),
      forwardedAt: r.forwardedAt?.toISOString() ?? '',
      closedAt: r.closedAt?.toISOString() ?? '',
    }));

    if (format === 'pdf') {
      streamPdf(res, 'Complaints Export', rows);
    } else if (format === 'csv') {
      const csv = generateCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="complaints_export.csv"');
      res.send(csv);
    } else {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Format must be csv or pdf.');
    }
  } catch (err) {
    next(err);
  }
});

export { router as statisticsRouter, adminRouter as adminStatisticsRouter };
