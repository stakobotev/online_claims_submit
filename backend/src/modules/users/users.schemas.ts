import { z } from 'zod';

export const updateUserAdminSchema = z
  .object({
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'blocked', 'deactivated']).optional(),
  })
  .refine((d) => d.role !== undefined || d.status !== undefined, {
    message: 'At least one of role or status is required.',
  });

export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>;
