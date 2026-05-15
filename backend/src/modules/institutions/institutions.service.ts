import { prisma } from '../../prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { CreateInstitutionInput, UpdateInstitutionInput } from './institutions.schemas.js';

export async function listInstitutions(opts: {
  category?: string;
  q?: string;
  page: number;
  size: number;
}) {
  const where = {
    active: true,
    ...(opts.category ? { categoryId: opts.category } : {}),
    ...(opts.q ? { name: { contains: opts.q, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      skip: (opts.page - 1) * opts.size,
      take: opts.size,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, categoryId: true, active: true, createdAt: true },
    }),
    prisma.institution.count({ where }),
  ]);

  return { data: items, page: opts.page, size: opts.size, total, pages: Math.ceil(total / opts.size) };
}

export async function createInstitution(data: CreateInstitutionInput) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid category.');

  return prisma.institution.create({
    data,
    select: { id: true, name: true, email: true, categoryId: true, active: true, createdAt: true },
  });
}

export async function updateInstitution(id: string, data: UpdateInstitutionInput) {
  const inst = await prisma.institution.findUnique({ where: { id } });
  if (!inst) throw new HttpError(404, 'NOT_FOUND', 'Institution not found.');

  return prisma.institution.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, categoryId: true, active: true, updatedAt: true },
  });
}

export async function deleteInstitution(id: string) {
  const inst = await prisma.institution.findUnique({ where: { id } });
  if (!inst) throw new HttpError(404, 'NOT_FOUND', 'Institution not found.');

  await prisma.institution.update({ where: { id }, data: { active: false } });
}
