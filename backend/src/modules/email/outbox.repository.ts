import { prisma } from '../../prisma.js';
import type { EmailOutbox } from '@prisma/client';

export interface EnqueueOptions {
  toAddress: string;
  fromAddress: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  template: string;
  relatedComplaintId?: string;
  relatedUserId?: string;
}

export async function enqueueEmail(opts: EnqueueOptions): Promise<EmailOutbox> {
  return prisma.emailOutbox.create({
    data: {
      toAddress: opts.toAddress,
      fromAddress: opts.fromAddress,
      subject: opts.subject,
      bodyHtml: opts.bodyHtml,
      bodyText: opts.bodyText,
      template: opts.template,
      relatedComplaintId: opts.relatedComplaintId ?? null,
      relatedUserId: opts.relatedUserId ?? null,
      status: 'pending',
      nextAttemptAt: new Date(),
    },
  });
}

export async function fetchPendingEmails(limit = 20): Promise<EmailOutbox[]> {
  return prisma.emailOutbox.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      attempts: { lt: 5 },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
  });
}

const BACKOFF_MINUTES = [1, 5, 15, 60, 360];

export async function markSent(id: string): Promise<void> {
  await prisma.emailOutbox.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date(), lastAttemptAt: new Date() },
  });
}

export async function markFailed(id: string, attempts: number, error: string): Promise<void> {
  const nextMinutes = BACKOFF_MINUTES[attempts] ?? 360;
  const nextAttemptAt = new Date(Date.now() + nextMinutes * 60_000);
  const isDead = attempts + 1 >= 5;

  await prisma.emailOutbox.update({
    where: { id },
    data: {
      status: isDead ? 'dead' : 'failed',
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      lastError: error,
      nextAttemptAt,
    },
  });
}
