import { prisma } from '../../prisma.js';

export async function getPublicSummary() {
  const [totalComplaints, totalForwarded, byCategory, byUrgency] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({ where: { status: { in: ['forwarded', 'closed'] } } }),
    prisma.complaint.groupBy({ by: ['categoryId'], _count: { id: true } }),
    prisma.complaint.groupBy({ by: ['urgent'], _count: { id: true } }),
  ]);

  return {
    totalComplaints,
    totalForwarded,
    byCategory: byCategory.map((r) => ({ id: r.categoryId, count: r._count.id })),
    byUrgency: {
      urgent: byUrgency.find((r) => r.urgent)?._count.id ?? 0,
      normal: byUrgency.find((r) => !r.urgent)?._count.id ?? 0,
    },
  };
}

export async function getAdminDetail(opts: { from?: string; to?: string }) {
  const dateFilter = {
    ...(opts.from ? { gte: new Date(opts.from) } : {}),
    ...(opts.to ? { lte: new Date(opts.to) } : {}),
  };
  const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const [byStatus, byInstitution, byMonth, bySubmissionType] = await Promise.all([
    prisma.complaint.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.complaint.groupBy({ by: ['institutionId'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 }),
    prisma.$queryRawUnsafe<Array<{ month: string; count: string }>>(
      `SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month, count(*)::text FROM "Complaint" GROUP BY month ORDER BY month`,
    ),
    prisma.complaint.groupBy({ by: ['submissionType'], where, _count: { id: true } }),
  ]);

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
    byInstitution: byInstitution.map((r) => ({ institutionId: r.institutionId, count: r._count.id })),
    byMonth: byMonth.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
    bySubmissionType: bySubmissionType.map((r) => ({ type: r.submissionType, count: r._count.id })),
  };
}

export async function getExportData(opts: { from?: string; to?: string }) {
  const dateFilter = {
    ...(opts.from ? { gte: new Date(opts.from) } : {}),
    ...(opts.to ? { lte: new Date(opts.to) } : {}),
  };
  const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  return prisma.complaint.findMany({
    where,
    select: {
      publicId: true,
      status: true,
      categoryId: true,
      submissionType: true,
      urgent: true,
      createdAt: true,
      forwardedAt: true,
      closedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
