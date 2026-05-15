// @ts-nocheck
import { jest } from '@jest/globals';
import { signAccessToken } from '../lib/jwt.js';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending_confirmation' | 'blocked' | 'deactivated';
  emailVerified: boolean;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  anonymizedAt: Date | null;
}

export function makeUser(role: 'admin' | 'user' = 'user', overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user-${role}-${Math.random().toString(36).slice(2, 8)}`,
    email: `${role}@test.example.com`,
    name: `Test ${role}`,
    role,
    status: 'active',
    emailVerified: true,
    passwordHash: '$argon2id$placeholder',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    lastLoginAt: null,
    anonymizedAt: null,
    ...overrides,
  };
}

export function makeAccessToken(user: Pick<MockUser, 'id' | 'email' | 'role'>): string {
  return signAccessToken({ sub: user.id, email: user.email, role: user.role });
}

export function mockPrismaModule() {
  return {
    prisma: {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      consent: {
        create: jest.fn(),
      },
      complaint: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      complaintEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      emailOutbox: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      institution: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      configuration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      oAuthIdentity: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      oAuthExchangeCode: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      attachment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown) => {
        if (Array.isArray(ops)) return Promise.resolve(ops.map(() => ({})));
        if (typeof ops === 'function') return ops({});
        return Promise.resolve([]);
      }),
      $queryRawUnsafe: jest.fn(),
      $disconnect: jest.fn(),
    },
  };
}
