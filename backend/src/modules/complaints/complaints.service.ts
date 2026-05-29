import { prisma } from '../../prisma.js';
import { generatePublicId } from '../../lib/ids.js';
import { enqueueMail } from '../email/email.service.js';
import { forwardToOmbudsman } from '../ombudsman/ombudsman.service.js';
import { audit } from '../auditLog/auditLog.service.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { config } from '../../config/index.js';
import type { SubmitComplaintInput } from './complaints.schemas.js';
import type { ComplaintStatus, Prisma } from '@prisma/client';

interface AttachmentFile {
  originalname: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

export async function submitComplaint(
  input: SubmitComplaintInput,
  files: AttachmentFile[],
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const bodyMinLen = config.MIN_BODY_LENGTH;
  if (input.body.length < bodyMinLen) {
    throw new HttpError(400, 'VALIDATION_ERROR', `Body must be at least ${bodyMinLen} characters.`);
  }

  if (input.institutionId) {
    const inst = await prisma.institution.findFirst({ where: { id: input.institutionId, active: true } });
    if (!inst) throw new HttpError(400, 'VALIDATION_ERROR', 'Institution not found or inactive.');
  }

  const year = new Date().getFullYear();
  const publicId = await generatePublicId(year);

  const isAnonymous = !userId;
  const status: ComplaintStatus = isAnonymous ? 'pending_review' : 'submitted';

  const complaint = await prisma.complaint.create({
    data: {
      publicId,
      userId: userId ?? null,
      categoryId: input.categoryId,
      institutionId: input.institutionId ?? null,
      institutionFreeText: input.institutionFreeText ?? null,
      title: input.title,
      body: input.body,
      urgent: Boolean(input.urgent),
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail || null,
      status,
      submissionType: isAnonymous ? 'anonymous' : 'authenticated',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      attachments: files.length > 0 ? {
        create: files.map((f) => ({
          originalFilename: f.originalname,
          storagePath: f.path,
          mimeType: f.mimetype,
          size: f.size,
        })),
      } : undefined,
    },
    include: { category: true, institution: true, attachments: true },
  });

  await prisma.complaintEvent.create({
    data: {
      complaintId: complaint.id,
      event: 'created',
      actorId: userId ?? null,
      metadata: { status },
    },
  });

  if (isAnonymous) {
    await prisma.complaintEvent.create({
      data: { complaintId: complaint.id, event: 'pending_review', actorId: null, metadata: {} },
    });
    await enqueueMail({
      template: 'admin.new_anonymous_complaint',
      to: config.OMBUDSMAN_EMAIL,
      subject: `[Vallentin Claims] New anonymous complaint ${publicId} requires review`,
      data: {
        publicId,
        categoryName: complaint.category.name,
        title: complaint.title,
        submittedAt: complaint.createdAt.toISOString(),
        adminUrl: `${config.PUBLIC_FRONTEND_URL}/admin/complaints/${publicId}`,
      },
      relatedComplaintId: complaint.id,
    });
  } else {
    await forwardComplaint(complaint.id);
  }

  if (files.length > 0) {
    await prisma.complaintEvent.create({
      data: {
        complaintId: complaint.id,
        event: 'attachment_added',
        actorId: userId ?? null,
        metadata: { count: files.length },
      },
    });
  }

  await audit({
    actorId: userId,
    event: 'complaint.created',
    target: `complaint:${publicId}`,
    ipAddress,
    userAgent,
    metadata: { status, submissionType: complaint.submissionType },
  });

  return { publicId, status: complaint.status, message: 'Your complaint has been submitted.' };
}

export async function forwardComplaint(complaintId: string): Promise<void> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { category: true, institution: true },
  });
  if (!complaint) return;
  if (complaint.status === 'forwarded' || complaint.status === 'closed') return;

  const institutionName = complaint.institution?.name ?? complaint.institutionFreeText ?? 'Unknown Institution';
  const institutionEmail = complaint.institution?.email;
  const submittedAt = complaint.createdAt.toISOString();

  const emailData = {
    publicId: complaint.publicId,
    categoryName: complaint.category.name,
    institutionName,
    title: complaint.title,
    body: complaint.body,
    urgent: complaint.urgent,
    submittedAt,
  };

  const forwardedToInstitution = !!institutionEmail;

  const committed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.complaint.updateMany({
      where: { id: complaintId, status: { notIn: ['forwarded', 'closed'] } },
      data: { status: 'forwarded', forwardedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    if (institutionEmail) {
      await enqueueMail(
        {
          template: 'complaint.to_institution',
          to: institutionEmail,
          subject: `[Vallentin Claims] Complaint ${complaint.publicId} — ${complaint.title}`,
          data: emailData,
          relatedComplaintId: complaint.id,
        },
        tx,
      );
      await tx.complaintEvent.create({
        data: {
          complaintId,
          event: 'email_dispatched',
          actorId: null,
          metadata: { template: 'complaint.to_institution', to: institutionEmail },
        },
      });
    } else {
      await tx.complaintEvent.create({
        data: {
          complaintId,
          event: 'email_failed',
          actorId: null,
          metadata: {
            template: 'complaint.to_institution',
            reason: 'no_institution_email',
            institutionFreeText: complaint.institutionFreeText,
          },
        },
      });
    }

    await forwardToOmbudsman({ ...emailData, relatedComplaintId: complaint.id }, tx);

    if (complaint.contactEmail) {
      await enqueueMail(
        {
          template: 'complaint.to_user_copy',
          to: complaint.contactEmail,
          subject: `[Vallentin Claims] Your complaint ${complaint.publicId} has been submitted`,
          data: emailData,
          relatedComplaintId: complaint.id,
        },
        tx,
      );
    }

    await tx.complaintEvent.create({
      data: {
        complaintId,
        event: 'forwarded',
        actorId: null,
        metadata: { forwardedToInstitution, forwardedToOmbudsman: true },
      },
    });

    return true;
  });

  if (!committed) return;

  await audit({
    event: 'complaint.state.changed',
    target: `complaint:${complaint.publicId}`,
    metadata: { status: 'forwarded', forwardedToInstitution, forwardedToOmbudsman: true },
  });
}

export async function listComplaints(opts: {
  userId?: string;
  isAdmin: boolean;
  q?: string;
  category?: string;
  institutionId?: string;
  status?: ComplaintStatus;
  from?: string;
  to?: string;
  urgent?: boolean;
  page: number;
  size: number;
}) {
  const where: Prisma.ComplaintWhereInput = {};

  if (!opts.isAdmin) {
    if (!opts.userId) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
    where.userId = opts.userId;
  } else {
    if (opts.category) where.categoryId = opts.category;
    if (opts.institutionId) where.institutionId = opts.institutionId;
    if (opts.status) where.status = opts.status;
    if (opts.from || opts.to) {
      where.createdAt = {
        ...(opts.from ? { gte: new Date(opts.from) } : {}),
        ...(opts.to ? { lte: new Date(opts.to) } : {}),
      };
    }
    if (opts.urgent !== undefined) where.urgent = opts.urgent;
    if (opts.q) {
      where.OR = [
        { title: { contains: opts.q, mode: 'insensitive' } },
        { body: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (opts.page - 1) * opts.size,
      take: opts.size,
      orderBy: { createdAt: 'desc' },
      include: { category: true, institution: true, attachments: { select: { id: true, originalFilename: true, mimeType: true, size: true } } },
    }),
    prisma.complaint.count({ where }),
  ]);

  return { data: items, page: opts.page, size: opts.size, total, pages: Math.ceil(total / opts.size) };
}

export async function getComplaintByPublicId(publicId: string, userId?: string, isAdmin = false) {
  const complaint = await prisma.complaint.findUnique({
    where: { publicId },
    include: { category: true, institution: true, attachments: { select: { id: true, originalFilename: true, mimeType: true, size: true } } },
  });

  if (!complaint) throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');

  if (!isAdmin && complaint.userId !== userId) {
    throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');
  }

  return complaint;
}

export async function approveComplaint(publicId: string, adminId: string): Promise<void> {
  const complaint = await prisma.complaint.findUnique({ where: { publicId } });
  if (!complaint) throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');
  if (complaint.status !== 'pending_review') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Only pending_review complaints can be approved.');
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { publicId },
      data: { status: 'approved', reviewedById: adminId, reviewedAt: new Date() },
    }),
    prisma.complaintEvent.create({
      data: { complaintId: complaint.id, event: 'approved', actorId: adminId, metadata: {} },
    }),
  ]);

  await audit({ actorId: adminId, event: 'admin.complaint.approved', target: `complaint:${publicId}` });

  await forwardComplaint(complaint.id);
}

export async function rejectComplaint(publicId: string, adminId: string, reason: string): Promise<void> {
  const complaint = await prisma.complaint.findUnique({ where: { publicId } });
  if (!complaint) throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');
  if (complaint.status !== 'pending_review') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Only pending_review complaints can be rejected.');
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { publicId },
      data: { status: 'rejected', reviewedById: adminId, reviewedAt: new Date() },
    }),
    prisma.complaintEvent.create({
      data: { complaintId: complaint.id, event: 'rejected', actorId: adminId, metadata: { reason } },
    }),
  ]);

  await audit({ actorId: adminId, event: 'admin.complaint.rejected', target: `complaint:${publicId}`, metadata: { reason } });
}

export async function closeComplaint(publicId: string, adminId: string): Promise<void> {
  const complaint = await prisma.complaint.findUnique({ where: { publicId } });
  if (!complaint) throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');
  if (complaint.status !== 'forwarded') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Only forwarded complaints can be closed.');
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { publicId },
      data: { status: 'closed', closedAt: new Date() },
    }),
    prisma.complaintEvent.create({
      data: { complaintId: complaint.id, event: 'closed', actorId: adminId, metadata: {} },
    }),
  ]);

  await audit({ actorId: adminId, event: 'admin.complaint.closed', target: `complaint:${publicId}` });
}

export async function getComplaintEvents(publicId: string) {
  const complaint = await prisma.complaint.findUnique({ where: { publicId } });
  if (!complaint) throw new HttpError(404, 'NOT_FOUND', 'Complaint not found.');

  return prisma.complaintEvent.findMany({
    where: { complaintId: complaint.id },
    orderBy: { at: 'asc' },
    include: { actor: { select: { id: true, email: true, name: true } } },
  });
}

export async function searchComplaints(opts: {
  q?: string;
  category?: string;
  institutionId?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}) {
  const where: Prisma.ComplaintWhereInput = {};

  if (opts.category) where.categoryId = opts.category;
  if (opts.institutionId) where.institutionId = opts.institutionId;
  if (opts.status) where.status = opts.status as ComplaintStatus;
  if (opts.from || opts.to) {
    where.createdAt = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  if (opts.q) {
    where.OR = [
      { title: { contains: opts.q, mode: 'insensitive' } },
      { body: { contains: opts.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (opts.page - 1) * opts.size,
      take: opts.size,
      orderBy: { createdAt: 'desc' },
      include: { category: true, institution: true },
    }),
    prisma.complaint.count({ where }),
  ]);

  return { data: items, page: opts.page, size: opts.size, total, pages: Math.ceil(total / opts.size) };
}
