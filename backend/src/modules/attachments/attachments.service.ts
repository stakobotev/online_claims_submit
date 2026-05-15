import { createReadStream } from 'node:fs';
import { prisma } from '../../prisma.js';
import { audit } from '../auditLog/auditLog.service.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { Response } from 'express';

export async function streamAttachment(
  attachmentId: string,
  userId: string,
  isAdmin: boolean,
  res: Response,
  ctx?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { complaint: { select: { id: true, publicId: true, userId: true } } },
  });

  if (!attachment) throw new HttpError(404, 'NOT_FOUND', 'Attachment not found.');

  if (!isAdmin && attachment.complaint.userId !== userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Access denied.');
  }

  await audit({
    actorId: userId,
    event: 'attachment.retrieved',
    target: `attachment:${attachment.id}`,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
    metadata: { complaint: attachment.complaint.publicId, filename: attachment.originalFilename },
  });

  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`);
  res.setHeader('Content-Length', attachment.size.toString());

  const stream = createReadStream(attachment.storagePath);
  stream.pipe(res);
}
