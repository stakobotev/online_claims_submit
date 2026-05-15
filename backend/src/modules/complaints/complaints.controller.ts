import type { Request, Response, NextFunction } from 'express';
import { verifyHCaptcha } from '../../lib/captcha.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  submitComplaint,
  listComplaints,
  getComplaintByPublicId,
  approveComplaint,
  rejectComplaint,
  closeComplaint,
  getComplaintEvents,
  searchComplaints,
} from './complaints.service.js';
import type { SubmitComplaintInput } from './complaints.schemas.js';
import type { ComplaintStatus } from '@prisma/client';
type MulterRequest = Request & { files?: Express.Multer.File[] };

export async function submitComplaintHandler(req: MulterRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAuthenticated = !!req.user;
    const body = req.body as SubmitComplaintInput & { captchaToken?: string };

    if (!isAuthenticated) {
      if (!body.captchaToken) {
        throw new HttpError(400, 'CAPTCHA_FAILED', 'CAPTCHA token is required for anonymous submissions.');
      }
      const ok = await verifyHCaptcha(body.captchaToken, req.ip ?? undefined);
      if (!ok) throw new HttpError(400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed.');
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const attachments = files.map((f) => ({
      originalname: f.originalname,
      filename: f.filename,
      path: f.path,
      mimetype: f.mimetype,
      size: f.size,
    }));

    const result = await submitComplaint(
      body,
      attachments,
      req.user?.sub,
      req.ip ?? undefined,
      req.headers['user-agent'],
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listComplaintsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'admin';
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query['size'] as string) || 20));

    const result = await listComplaints({
      userId: req.user?.sub,
      isAdmin,
      q: (req.query['q'] as string) || undefined,
      category: (req.query['category'] as string) || undefined,
      institutionId: (req.query['institutionId'] as string) || undefined,
      status: (req.query['status'] as ComplaintStatus) || undefined,
      from: (req.query['from'] as string) || undefined,
      to: (req.query['to'] as string) || undefined,
      urgent: req.query['urgent'] !== undefined ? req.query['urgent'] === 'true' : undefined,
      page,
      size,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getComplaintHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { publicId } = req.params as { publicId: string };
    const isAdmin = req.user?.role === 'admin';
    const complaint = await getComplaintByPublicId(publicId, req.user?.sub, isAdmin);
    res.json(complaint);
  } catch (err) {
    next(err);
  }
}

export async function approveComplaintHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { publicId } = req.params as { publicId: string };
    await approveComplaint(publicId, req.user.sub);
    res.json({ message: 'Complaint approved and forwarded.' });
  } catch (err) {
    next(err);
  }
}

export async function rejectComplaintHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { publicId } = req.params as { publicId: string };
    const { reason } = req.body as { reason: string };
    await rejectComplaint(publicId, req.user.sub, reason);
    res.json({ message: 'Complaint rejected.' });
  } catch (err) {
    next(err);
  }
}

export async function updateComplaintStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    const { publicId } = req.params as { publicId: string };
    const { status } = req.body as { status: string };
    if (status === 'closed') {
      await closeComplaint(publicId, req.user.sub);
      res.json({ message: 'Complaint closed.' });
    } else {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Only "closed" status transition is permitted via this endpoint.');
    }
  } catch (err) {
    next(err);
  }
}

export async function getComplaintEventsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { publicId } = req.params as { publicId: string };
    const events = await getComplaintEvents(publicId);
    res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function searchComplaintsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query['size'] as string) || 20));

    const result = await searchComplaints({
      q: (req.query['q'] as string) || undefined,
      category: (req.query['category'] as string) || undefined,
      institutionId: (req.query['institutionId'] as string) || undefined,
      status: (req.query['status'] as string) || undefined,
      from: (req.query['from'] as string) || undefined,
      to: (req.query['to'] as string) || undefined,
      page,
      size,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
