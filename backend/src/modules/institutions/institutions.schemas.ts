import { z } from 'zod';

export const createInstitutionSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(300),
  email: z.string().email(),
});

export const updateInstitutionSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(300).optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;
