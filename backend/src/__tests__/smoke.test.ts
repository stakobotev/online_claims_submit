// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('../prisma.js', () => ({
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
    },
    configuration: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    oAuthIdentity: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown) => {
      if (Array.isArray(ops)) return Promise.resolve(ops.map(() => ({})));
      if (typeof ops === 'function') return ops({});
      return Promise.resolve([]);
    }),
    $queryRawUnsafe: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../modules/email/email.service.js', () => ({
  enqueueMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../modules/ombudsman/ombudsman.service.js', () => ({
  forwardToOmbudsman: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/captcha.js', () => ({
  verifyHCaptcha: jest.fn().mockResolvedValue(true),
}));

import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../prisma.js';
import * as argon2 from 'argon2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = prisma as any;
const app = createApp();

const TEST_USER = {
  id: 'user-id-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '',
  role: 'user' as const,
  status: 'active' as const,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  anonymizedAt: null,
};

beforeAll(async () => {
  TEST_USER.passwordHash = await argon2.hash('TestPass!1', { type: argon2.argon2id });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/config/public', () => {
  it('returns config shape', async () => {
    const res = await request(app).get('/api/config/public');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('minBodyLength');
    expect(res.body).toHaveProperty('captchaSiteKey');
    expect(Array.isArray(res.body.allowedAttachmentMime)).toBe(true);
  });
});

describe('POST /api/auth/register', () => {
  it('returns 201 on valid registration', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaMock.user.create as jest.Mock).mockResolvedValue({ ...TEST_USER, status: 'pending_confirmation' });
    (prismaMock.consent.create as jest.Mock).mockResolvedValue({});
    (prismaMock.emailVerificationToken.create as jest.Mock).mockResolvedValue({});
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValue([{ value: '1' }]);

    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      name: 'New User',
      password: 'TestPass!1',
      passwordConfirmation: 'TestPass!1',
      captchaToken: 'test-token',
      consents: { termsVersion: '1.0', privacyVersion: '1.0', marketing: false },
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.status).toBe('pending_confirmation');
  });

  it('returns 409 when email already exists', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(TEST_USER);

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      name: 'Test',
      password: 'TestPass!1',
      passwordConfirmation: 'TestPass!1',
      captchaToken: 'test-token',
      consents: { termsVersion: '1.0', privacyVersion: '1.0', marketing: false },
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 on weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      name: 'Test',
      password: 'weak',
      passwordConfirmation: 'weak',
      captchaToken: 'test-token',
      consents: { termsVersion: '1.0', privacyVersion: '1.0', marketing: false },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('returns access token on valid credentials', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(TEST_USER);
    (prismaMock.refreshToken.create as jest.Mock).mockResolvedValue({});
    (prismaMock.user.update as jest.Mock).mockResolvedValue({});
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'TestPass!1',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 401 on invalid credentials', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(TEST_USER);
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPass!1',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});

describe('POST /api/complaints (anonymous)', () => {
  it('creates complaint with pending_review status', async () => {
    (prismaMock.institution.findFirst as jest.Mock).mockResolvedValue({ id: 'inst-1', name: 'Test Hospital', email: 'test@hospital.com', active: true });
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValue([{ value: '1' }]);
    (prismaMock.complaint.create as jest.Mock).mockResolvedValue({
      id: 'complaint-1',
      publicId: 'VLC-2026-000001',
      status: 'pending_review',
      submissionType: 'anonymous',
      category: { name: 'Hospitals' },
      institution: { name: 'Test Hospital', email: 'test@hospital.com' },
      contactEmail: null,
      createdAt: new Date(),
    });
    (prismaMock.complaintEvent.create as jest.Mock).mockResolvedValue({});
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/complaints')
      .field('categoryId', 'hospitals')
      .field('institutionId', 'inst-1')
      .field('title', 'Test Complaint Title')
      .field('body', 'This is a test complaint body that is long enough to meet the minimum length requirement for submission in the system.')
      .field('captchaToken', 'test-captcha-token');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_review');
    expect(res.body.publicId).toBeTruthy();
  });
});

describe('POST /api/admin/complaints/:publicId/approve', () => {
  it('approves a pending_review complaint', async () => {
    const adminUser = { ...TEST_USER, role: 'admin' as const };

    const mockComplaint = {
      id: 'complaint-1',
      publicId: 'VLC-2026-000001',
      status: 'pending_review' as const,
      contactEmail: null,
      category: { name: 'Hospitals' },
      institution: { name: 'Test Hospital', email: 'test@hospital.com' },
      institutionFreeText: null,
      title: 'Test',
      body: 'Body text',
      urgent: false,
      createdAt: new Date(),
    };

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
    (prismaMock.refreshToken.create as jest.Mock).mockResolvedValue({});
    (prismaMock.user.update as jest.Mock).mockResolvedValue({});
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'TestPass!1',
    });

    adminUser.passwordHash = TEST_USER.passwordHash;
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const loginRes2 = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'TestPass!1',
    });
    const token = loginRes2.body.accessToken;

    (prismaMock.complaint.findUnique as jest.Mock).mockResolvedValue(mockComplaint);
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([{}, {}]);
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/admin/complaints/VLC-2026-000001/approve')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('approved');
  });
});

describe('Email outbox enqueue', () => {
  it('enqueueMail creates an outbox record', async () => {
    const { enqueueMail } = await import('../modules/email/email.service.js');
    (prismaMock.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-1' });

    const mod = await import('../modules/email/outbox.repository.js');
    (prismaMock.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-1' });

    await mod.enqueueEmail({
      toAddress: 'test@example.com',
      fromAddress: 'no-reply@vallentin.local',
      subject: 'Test',
      bodyHtml: '<p>Test</p>',
      bodyText: 'Test',
      template: 'auth.verify_email',
    });

    expect(prismaMock.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ toAddress: 'test@example.com' }) }),
    );
  });
});
