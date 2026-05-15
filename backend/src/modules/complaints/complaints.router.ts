import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import multer from 'multer';
import { mkdirSync, unlink } from 'node:fs';
import { extname } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromFile } from 'file-type';
import { config } from '../../config/index.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { complaintSubmitRateLimit } from '../../middleware/rateLimit.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  submitComplaintHandler,
  listComplaintsHandler,
  getComplaintHandler,
  approveComplaintHandler,
  rejectComplaintHandler,
  updateComplaintStatusHandler,
  getComplaintEventsHandler,
  searchComplaintsHandler,
} from './complaints.controller.js';
import {
  submitComplaintSchema,
  adminComplaintStatusSchema,
  rejectComplaintSchema,
} from './complaints.schemas.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/bmp',
  'image/jpeg',
  'image/png',
  'image/tiff',
]);

mkdirSync(config.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: {
    files: config.MAX_ATTACHMENTS,
    fileSize: config.MAX_ATTACHMENT_FILE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', `File type ${file.mimetype} is not allowed.`));
    }
  },
});

function discardFile(path: string): void {
  unlink(path, () => undefined);
}

async function verifyAttachments(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) return next();

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > config.MAX_ATTACHMENT_TOTAL_BYTES) {
    for (const f of files) discardFile(f.path);
    return next(
      new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Combined attachment size exceeds the limit.', {
        totalBytes,
        maxBytes: config.MAX_ATTACHMENT_TOTAL_BYTES,
      }),
    );
  }

  for (const file of files) {
    const detected = await fileTypeFromFile(file.path);
    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
      for (const f of files) discardFile(f.path);
      return next(
        new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Attachment content does not match an allowed file type.', {
          file: file.originalname,
          declared: file.mimetype,
          detected: detected?.mime ?? null,
        }),
      );
    }
    file.mimetype = detected.mime;
  }

  next();
}

const router = Router();
const adminRouter = Router();

router.post(
  '/complaints',
  complaintSubmitRateLimit,
  optionalAuth,
  upload.array('attachments', config.MAX_ATTACHMENTS),
  verifyAttachments as RequestHandler,
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = submitComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.flatten().fieldErrors as Record<string, unknown>));
    }
    req.body = parsed.data;
    next();
  },
  submitComplaintHandler as RequestHandler,
);

router.get('/complaints', requireAuth, listComplaintsHandler);
router.get('/complaints/:publicId', requireAuth, getComplaintHandler);

adminRouter.get('/complaints/search', requireAuth, requireRole('admin'), searchComplaintsHandler);
adminRouter.post('/complaints/:publicId/approve', requireAuth, requireRole('admin'), approveComplaintHandler);
adminRouter.post('/complaints/:publicId/reject', requireAuth, requireRole('admin'), validate(rejectComplaintSchema), rejectComplaintHandler);
adminRouter.patch('/complaints/:publicId/status', requireAuth, requireRole('admin'), validate(adminComplaintStatusSchema), updateComplaintStatusHandler);
adminRouter.get('/complaints/:publicId/events', requireAuth, requireRole('admin'), getComplaintEventsHandler);

export { router as complaintsRouter, adminRouter as adminComplaintsRouter };
