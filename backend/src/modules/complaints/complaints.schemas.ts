import { z } from 'zod';

export const submitComplaintSchema = z.object({
  categoryId: z.string().min(1),
  institutionId: z.string().uuid().optional(),
  institutionFreeText: z.string().max(300).optional(),
  title: z.string().min(5).max(500),
  body: z.string(),
  urgent: z
    .union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')])
    .optional()
    .default(false),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  captchaToken: z.string().optional(),
}).refine(
  (d) => d.institutionId || d.institutionFreeText,
  { message: 'Either institutionId or institutionFreeText is required.', path: ['institutionId'] },
);

export const adminComplaintStatusSchema = z.object({
  status: z.literal('closed'),
});

export const rejectComplaintSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const searchComplaintsQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  institutionId: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  size: z.coerce.number().min(1).max(100).default(20),
});

export type SubmitComplaintInput = z.infer<typeof submitComplaintSchema>;
