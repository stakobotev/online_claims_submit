import { prisma } from '../../prisma.js';
import type { ConsentDocument } from '@prisma/client';

export interface StoreConsentOptions {
  userId: string;
  document: ConsentDocument;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function storeConsent(opts: StoreConsentOptions): Promise<void> {
  await prisma.consent.create({
    data: {
      userId: opts.userId,
      document: opts.document,
      version: opts.version,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    },
  });
}
