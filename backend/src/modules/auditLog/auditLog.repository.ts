import { prisma } from '../../prisma.js';

export interface AuditEntry {
  actorId?: string;
  event: string;
  target?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      event: entry.event,
      target: entry.target ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: (entry.metadata ?? {}) as object,
    },
  });
}
