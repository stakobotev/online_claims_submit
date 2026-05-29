import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma.js';
import { audit } from '../auditLog/auditLog.service.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { UserRole, UserStatus } from '@prisma/client';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  return user;
}

export async function listUsers(opts: {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  size: number;
}) {
  const where = {
    ...(opts.q ? { OR: [
      { email: { contains: opts.q, mode: 'insensitive' as const } },
      { name: { contains: opts.q, mode: 'insensitive' as const } },
    ]} : {}),
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.status ? { status: opts.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        anonymizedAt: true,
      },
      skip: (opts.page - 1) * opts.size,
      take: opts.size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { data: items, page: opts.page, size: opts.size, total, pages: Math.ceil(total / opts.size) };
}

export async function updateUser(
  targetId: string,
  data: { role?: UserRole; status?: UserStatus },
  actorId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (data.role) {
    await audit({ actorId, event: 'admin.user.role_updated', target: `user:${targetId}`, metadata: { newRole: data.role } });
  }
  if (data.status) {
    await audit({ actorId, event: 'admin.user.status_updated', target: `user:${targetId}`, metadata: { newStatus: data.status } });
  }

  return updated;
}

export async function anonymizeUser(targetId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  if (user.anonymizedAt) throw new HttpError(409, 'CONFLICT', 'User already anonymized.');

  const anonId = uuidv4();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetId },
      data: {
        email: `deleted-${anonId}@anonymized.invalid`,
        name: `Deleted User`,
        passwordHash: null,
        anonymizedAt: new Date(),
        status: 'deactivated',
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: targetId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: targetId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.complaint.updateMany({
      where: { userId: targetId },
      data: { ipAddress: null, userAgent: null, contactName: null, contactEmail: null },
    }),
    prisma.consent.updateMany({
      where: { userId: targetId },
      data: { ipAddress: null, userAgent: null },
    }),
  ]);

  await audit({ actorId, event: 'admin.user.anonymized', target: `user:${targetId}` });

  return { anonymized: true };
}

export async function exportUserData(targetId: string, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      anonymizedAt: true,
    },
  });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');

  const [consents, complaints, oauthIdentities, auditLogs] = await Promise.all([
    prisma.consent.findMany({
      where: { userId: targetId },
      select: { document: true, version: true, acceptedAt: true, ipAddress: true, userAgent: true },
      orderBy: { acceptedAt: 'asc' },
    }),
    prisma.complaint.findMany({
      where: { userId: targetId },
      include: {
        category: { select: { id: true, name: true } },
        institution: { select: { id: true, name: true } },
        attachments: { select: { id: true, originalFilename: true, mimeType: true, size: true, createdAt: true } },
        events: { select: { event: true, at: true, metadata: true }, orderBy: { at: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.oAuthIdentity.findMany({
      where: { userId: targetId },
      select: { provider: true, providerUserId: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorId: targetId },
      select: { event: true, target: true, at: true, ipAddress: true, userAgent: true, metadata: true },
      orderBy: { at: 'asc' },
    }),
  ]);

  await audit({
    actorId,
    event: 'admin.user.exported',
    target: `user:${targetId}`,
    metadata: { complaints: complaints.length, consents: consents.length },
  });

  return {
    exportedAt: new Date().toISOString(),
    user,
    consents,
    oauthIdentities,
    complaints,
    auditLogs,
  };
}
