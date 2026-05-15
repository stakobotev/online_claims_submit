import { prisma } from '../../prisma.js';

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { id: 'asc' } });
}
