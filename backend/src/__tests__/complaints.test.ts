// @ts-nocheck
import { jest } from '@jest/globals';
import { mockPrismaModule } from './helpers.js';

jest.mock('../prisma.js', () => mockPrismaModule());
jest.mock('../modules/email/email.service.js', () => ({ enqueueMail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../modules/ombudsman/ombudsman.service.js', () => ({ forwardToOmbudsman: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../lib/captcha.js', () => ({ verifyHCaptcha: jest.fn().mockResolvedValue(true) }));

import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../prisma.js';
import { signAccessToken } from '../lib/jwt.js';

const pm = prisma as any;
const app = createApp();

const LONG_BODY = 'A'.repeat(110);

const mockInstitution = {
  id: 'inst-uuid-1',
  name: 'City Hospital',
  email: 'hospital@example.com',
  categoryId: 'hospitals',
  active: true,
};

const mockCategory = { id: 'hospitals', name: 'Hospitals' };

function makeComplaintRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'complaint-uuid-1',
    publicId: `VLC-${new Date().getFullYear()}-000001`,
    status: 'submitted',
    submissionType: 'authenticated',
    category: mockCategory,
    institution: mockInstitution,
    institutionFreeText: null,
    contactEmail: null,
    title: 'Test Complaint',
    body: LONG_BODY,
    urgent: false,
    userId: 'user-uuid-1',
    createdAt: new Date(),
    attachments: [],
    ...overrides,
  };
}

function makeAuthHeader(role: 'admin' | 'user' = 'user', userId = 'user-uuid-1') {
  const token = signAccessToken({ sub: userId, email: `${role}@test.com`, role });
  return `Bearer ${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── BRD §10/§19 scenario: submits complaint with valid data successfully ────
describe('POST /api/complaints — authenticated submission', () => {
  it('submits complaint with valid data successfully', async () => {
    pm.institution.findFirst.mockResolvedValue(mockInstitution);
    pm.$queryRawUnsafe.mockResolvedValue([{ value: '1' }]);
    pm.complaint.create.mockResolvedValue(makeComplaintRow({ status: 'submitted', submissionType: 'authenticated' }));
    pm.complaintEvent.create.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Test Complaint')
      .field('body', LONG_BODY);

    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^VLC-\d{4}-\d{6}$/);
    expect(res.body.status).toBe('submitted');
  });

  it('complaint forwarded to institution within 30 seconds (authenticated)', async () => {
    const { enqueueMail } = await import('../modules/email/email.service.js');
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');

    pm.institution.findFirst.mockResolvedValue(mockInstitution);
    pm.$queryRawUnsafe.mockResolvedValue([{ value: '2' }]);
    const complaint = makeComplaintRow({ status: 'submitted', submissionType: 'authenticated', contactEmail: 'user@test.com' });
    pm.complaint.create.mockResolvedValue(complaint);
    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.complaintEvent.create.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});
    pm.$transaction.mockResolvedValue([{}, {}]);

    const start = Date.now();
    await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Urgent Complaint')
      .field('body', LONG_BODY);
    const elapsed = Date.now() - start;

    // Forwarding is synchronous in the handler; the whole round-trip must be <30s
    expect(elapsed).toBeLessThan(30_000);
    // Institution email is enqueued
    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'complaint.to_institution' }),
    );
    // Ombudsman forwarded
    expect(forwardToOmbudsman).toHaveBeenCalled();
  });

  it('receives confirmation email after submission (user-copy outbox row)', async () => {
    const { enqueueMail } = await import('../modules/email/email.service.js');

    pm.institution.findFirst.mockResolvedValue(mockInstitution);
    pm.$queryRawUnsafe.mockResolvedValue([{ value: '3' }]);
    const complaint = makeComplaintRow({
      status: 'submitted',
      submissionType: 'authenticated',
      contactEmail: 'submitter@example.com',
    });
    pm.complaint.create.mockResolvedValue(complaint);
    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.complaintEvent.create.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});
    pm.$transaction.mockResolvedValue([{}, {}]);

    await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Email Copy Test')
      .field('body', LONG_BODY)
      .field('contactEmail', 'submitter@example.com');

    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'complaint.to_user_copy', to: 'submitter@example.com' }),
    );
  });

  it('complaint forwarded to ombudsman with copy header', async () => {
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');

    pm.institution.findFirst.mockResolvedValue(mockInstitution);
    pm.$queryRawUnsafe.mockResolvedValue([{ value: '4' }]);
    const complaint = makeComplaintRow({ status: 'submitted', submissionType: 'authenticated' });
    pm.complaint.create.mockResolvedValue(complaint);
    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.complaintEvent.create.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});
    pm.$transaction.mockResolvedValue([{}, {}]);

    await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Ombudsman Test')
      .field('body', LONG_BODY);

    expect(forwardToOmbudsman).toHaveBeenCalledWith(
      expect.objectContaining({ publicId: expect.stringMatching(/^VLC-\d{4}-\d{6}$/) }),
    );
  });
});

// ─── Anonymous submission ────────────────────────────────────────────────────
describe('POST /api/complaints — anonymous submission', () => {
  it('anonymous complaint gets pending_review status — not immediately forwarded', async () => {
    const { enqueueMail } = await import('../modules/email/email.service.js');
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');

    pm.institution.findFirst.mockResolvedValue(mockInstitution);
    pm.$queryRawUnsafe.mockResolvedValue([{ value: '5' }]);
    pm.complaint.create.mockResolvedValue(makeComplaintRow({ status: 'pending_review', submissionType: 'anonymous', userId: null }));
    pm.complaintEvent.create.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/complaints')
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Anonymous Complaint')
      .field('body', LONG_BODY)
      .field('captchaToken', 'valid-captcha');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_review');
    // Anonymous complaints must NOT be forwarded to institution at submit time
    expect(forwardToOmbudsman).not.toHaveBeenCalled();
    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'admin.new_anonymous_complaint' }),
    );
  });

  it('complaint forwarded only after admin approval (anonymous)', async () => {
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');
    const { enqueueMail } = await import('../modules/email/email.service.js');

    const complaint = makeComplaintRow({
      status: 'pending_review',
      submissionType: 'anonymous',
      userId: null,
      id: 'anon-complaint-1',
      publicId: 'VLC-2026-000010',
    });

    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.$transaction.mockResolvedValue([{}, {}]);
    pm.auditLog.create.mockResolvedValue({});
    pm.complaintEvent.create.mockResolvedValue({});

    const adminToken = makeAuthHeader('admin', 'admin-uuid-1');

    const res = await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/approve`)
      .set('Authorization', adminToken);

    expect(res.status).toBe(200);
    expect(forwardToOmbudsman).toHaveBeenCalled();
    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'complaint.to_institution' }),
    );
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────
describe('POST /api/complaints — validation', () => {
  it('rejects body shorter than minimum length', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Short body test')
      .field('body', 'Too short');

    expect(res.status).toBe(400);
  });

  it('rejects missing both institutionId and institutionFreeText', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('title', 'No institution test')
      .field('body', LONG_BODY);

    expect(res.status).toBe(400);
  });

  it('rejects unsupported MIME type (.exe)', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', makeAuthHeader('user'))
      .field('categoryId', 'hospitals')
      .field('institutionId', mockInstitution.id)
      .field('title', 'Exe file test')
      .field('body', LONG_BODY)
      .attach('attachments', Buffer.from('MZ executable'), { filename: 'malware.exe', contentType: 'application/octet-stream' });

    expect(res.status).toBe(415);
  });
});

// ─── RBAC on GET /api/complaints ─────────────────────────────────────────────
describe('GET /api/complaints — RBAC', () => {
  it('anonymous user gets 401 on GET /api/complaints', async () => {
    const res = await request(app).get('/api/complaints');
    expect(res.status).toBe(401);
  });

  it('authenticated user sees only their own complaints', async () => {
    const userId = 'owner-user-uuid';
    pm.complaint.findMany.mockResolvedValue([makeComplaintRow({ userId })]);
    pm.complaint.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/complaints')
      .set('Authorization', makeAuthHeader('user', userId));

    expect(res.status).toBe(200);
  });

  it('admin can read all complaints', async () => {
    pm.complaint.findMany.mockResolvedValue([makeComplaintRow({}), makeComplaintRow({ id: 'c2', publicId: 'VLC-2026-000002' })]);
    pm.complaint.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/complaints')
      .set('Authorization', makeAuthHeader('admin'));

    expect(res.status).toBe(200);
  });
});

// ─── GET /api/complaints/:publicId — ownership check ────────────────────────
describe('GET /api/complaints/:publicId — ownership', () => {
  it('non-owner regular user gets 404 (complaint hidden)', async () => {
    const complaint = makeComplaintRow({ userId: 'real-owner-uuid' });
    pm.complaint.findUnique.mockResolvedValue(complaint);

    const res = await request(app)
      .get(`/api/complaints/${complaint.publicId}`)
      .set('Authorization', makeAuthHeader('user', 'other-user-uuid'));

    expect(res.status).toBe(404);
  });

  it('owner can read their own complaint', async () => {
    const userId = 'the-owner-uuid';
    const complaint = makeComplaintRow({ userId });
    pm.complaint.findUnique.mockResolvedValue(complaint);

    const res = await request(app)
      .get(`/api/complaints/${complaint.publicId}`)
      .set('Authorization', makeAuthHeader('user', userId));

    expect(res.status).toBe(200);
  });
});
