import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../prisma.js';

export async function generatePublicId(year: number): Promise<string> {
  const key = `complaint_counter_${year}`;

  const result = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `INSERT INTO "Configuration" (key, value, "updatedAt")
     VALUES ($1, '1', now())
     ON CONFLICT (key) DO UPDATE
       SET value = (CAST("Configuration".value AS bigint) + 1)::text,
           "updatedAt" = now()
     RETURNING value`,
    key,
  );

  const counter = parseInt(result[0]?.value ?? '1', 10);
  const padded = String(counter).padStart(6, '0');
  return `VLC-${year}-${padded}`;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
