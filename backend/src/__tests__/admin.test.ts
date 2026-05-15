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

function adminToken() {
  return `Bearer ${signAccessToken({ sub: 'admin-uuid-1', email: 'admin@test.com', role: 'admin' })}`;
}

function userToken(id = 'user-uuid-1') {
  return `Bearer ${signAccessToken({ sub: id, email: 'user@test.com', role: 'user' })}`;
}

const mockInstitution = {
  id: 'inst-uuid-1',
  name: 'City Hospital',
  email: 'hospital@example.com',
  categoryId: 'hospitals',
  active: true,
};

const mockCategory = { id: 'hospitals', name: 'Hospitals' };

function pendingComplaint(overrides = {}) {
  return {
    id: 'complaint-uuid-pending',
    publicId: 'VLC-2026-000099',
    status: 'pending_review',
    submissionType: 'anonymous',
    category: mockCategory,
    institution: mockInstitution,
    institutionFreeText: null,
    contactEmail: null,
    title: 'Admin Test',
    body: 'A'.repeat(110),
    urgent: false,
    userId: null,
    createdAt: new Date(),
    reviewedById: null,
    reviewedAt: null,
    attachments: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── BRD §10/§19 scenario: admin updates complaint status ────────────────────
describe('POST /api/admin/complaints/:publicId/approve', () => {
  it('admin updates complaint status — approve transitions pending_review to approved then forwarded', async () => {
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');
    const { enqueueMail } = await import('../modules/email/email.service.js');

    const complaint = pendingComplaint();
    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.$transaction.mockResolvedValue([{}, {}]);
    pm.auditLog.create.mockResolvedValue({});
    pm.complaintEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/approve`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);
    expect(pm.$transaction).toHaveBeenCalled();
    expect(forwardToOmbudsman).toHaveBeenCalled();
    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'complaint.to_institution' }),
    );
  });

  it('approve enqueues outbox rows for institution and ombudsman', async () => {
    const { forwardToOmbudsman } = await import('../modules/ombudsman/ombudsman.service.js');
    const { enqueueMail } = await import('../modules/email/email.service.js');

    const complaint = pendingComplaint();
    pm.complaint.findUnique.mockResolvedValue({ ...complaint, institution: mockInstitution, category: mockCategory });
    pm.$transaction.mockResolvedValue([{}, {}]);
    pm.auditLog.create.mockResolvedValue({});
    pm.complaintEvent.create.mockResolvedValue({});

    await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/approve`)
      .set('Authorization', adminToken());

    expect(enqueueMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'complaint.to_institution' }),
    );
    expect(forwardToOmbudsman).toHaveBeenCalledWith(
      expect.objectContaining({ publicId: complaint.publicId }),
    );
  });

  it('only admin role can approve — user gets 403', async () => {
    const res = await request(app)
      .post('/api/admin/complaints/VLC-2026-000099/approve')
      .set('Authorization', userToken());

    expect(res.status).toBe(403);
  });

  it('approve on non-pending_review complaint returns 400', async () => {
    const complaint = pendingComplaint({ status: 'forwarded' });
    pm.complaint.findUnique.mockResolvedValue(complaint);

    const res = await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/approve`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/complaints/:publicId/reject', () => {
  it('reject transitions pending_review to rejected with reason recorded', async () => {
    const complaint = pendingComplaint();
    pm.complaint.findUnique.mockResolvedValue(complaint);
    pm.$transaction.mockResolvedValue([{}, {}]);
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/reject`)
      .set('Authorization', adminToken())
      .send({ reason: 'Insufficient evidence provided.' });

    expect(res.status).toBe(200);
    expect(pm.$transaction).toHaveBeenCalled();
  });

  it('reject without reason returns 400', async () => {
    const res = await request(app)
      .post('/api/admin/complaints/VLC-2026-000099/reject')
      .set('Authorization', adminToken())
      .send({ reason: '' });

    expect(res.status).toBe(400);
  });

  it('reject on non-pending_review complaint returns 400', async () => {
    const complaint = pendingComplaint({ status: 'forwarded' });
    pm.complaint.findUnique.mockResolvedValue(complaint);

    const res = await request(app)
      .post(`/api/admin/complaints/${complaint.publicId}/reject`)
      .set('Authorization', adminToken())
      .send({ reason: 'Invalid status' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/complaints/:publicId/status', () => {
  it('close transitions forwarded to closed', async () => {
    const complaint = pendingComplaint({ status: 'forwarded' });
    pm.complaint.findUnique.mockResolvedValue(complaint);
    pm.$transaction.mockResolvedValue([{}, {}]);
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/admin/complaints/${complaint.publicId}/status`)
      .set('Authorization', adminToken())
      .send({ status: 'closed' });

    expect(res.status).toBe(200);
  });

  it('cannot close complaint that is not forwarded', async () => {
    const complaint = pendingComplaint({ status: 'pending_review' });
    pm.complaint.findUnique.mockResolvedValue(complaint);

    const res = await request(app)
      .patch(`/api/admin/complaints/${complaint.publicId}/status`)
      .set('Authorization', adminToken())
      .send({ status: 'closed' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid status values', async () => {
    const res = await request(app)
      .patch('/api/admin/complaints/VLC-2026-000099/status')
      .set('Authorization', adminToken())
      .send({ status: 'approved' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/users/:id', () => {
  it('admin can update user role', async () => {
    const targetUser = {
      id: 'target-user-uuid',
      email: 'target@test.com',
      name: 'Target User',
      role: 'user',
      status: 'active',
    };
    pm.user.findUnique.mockResolvedValue(targetUser);
    pm.user.update.mockResolvedValue({ ...targetUser, role: 'admin' });
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/admin/users/${targetUser.id}`)
      .set('Authorization', adminToken())
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(pm.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'admin' }) }),
    );
  });

  it('admin can block a user', async () => {
    const targetUser = { id: 'target-uuid', email: 'block@test.com', name: 'Target', role: 'user', status: 'active' };
    pm.user.findUnique.mockResolvedValue(targetUser);
    pm.user.update.mockResolvedValue({ ...targetUser, status: 'blocked' });
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/admin/users/${targetUser.id}`)
      .set('Authorization', adminToken())
      .send({ status: 'blocked' });

    expect(res.status).toBe(200);
  });

  it('non-admin cannot update user', async () => {
    const res = await request(app)
      .patch('/api/admin/users/some-uuid')
      .set('Authorization', userToken())
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });
});

describe('Admin institution CRUD', () => {
  it('admin can create institution', async () => {
    pm.category.findUnique.mockResolvedValue(mockCategory);
    pm.institution.create.mockResolvedValue({ id: 'new-inst-uuid', ...mockInstitution, createdAt: new Date() });

    const res = await request(app)
      .post('/api/admin/institutions')
      .set('Authorization', adminToken())
      .send({ categoryId: 'hospitals', name: 'New Hospital', email: 'new@hospital.com' });

    expect(res.status).toBe(201);
    expect(pm.institution.create).toHaveBeenCalled();
  });

  it('admin can update institution', async () => {
    pm.institution.findUnique.mockResolvedValue(mockInstitution);
    pm.institution.update.mockResolvedValue({ ...mockInstitution, name: 'Updated Hospital', updatedAt: new Date() });

    const res = await request(app)
      .patch(`/api/admin/institutions/${mockInstitution.id}`)
      .set('Authorization', adminToken())
      .send({ name: 'Updated Hospital' });

    expect(res.status).toBe(200);
  });

  it('admin can soft-delete institution', async () => {
    pm.institution.findUnique.mockResolvedValue(mockInstitution);
    pm.institution.update.mockResolvedValue({ ...mockInstitution, active: false });

    const res = await request(app)
      .delete(`/api/admin/institutions/${mockInstitution.id}`)
      .set('Authorization', adminToken());

    expect([200, 204]).toContain(res.status);
  });

  it('non-admin cannot create institution', async () => {
    const res = await request(app)
      .post('/api/admin/institutions')
      .set('Authorization', userToken())
      .send({ categoryId: 'hospitals', name: 'Hack', email: 'hack@test.com' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/users/:id/anonymize', () => {
  it('GDPR anonymize replaces personal fields but keeps complaints', async () => {
    const targetUser = {
      id: 'anon-target-uuid',
      email: 'real@email.com',
      name: 'Real Name',
      role: 'user',
      status: 'active',
      anonymizedAt: null,
    };
    pm.user.findUnique.mockResolvedValue(targetUser);
    pm.user.update.mockResolvedValue({ ...targetUser, email: 'deleted-xxx@anonymized.invalid', name: 'Deleted User', anonymizedAt: new Date() });
    pm.refreshToken.updateMany.mockResolvedValue({});
    pm.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/admin/users/${targetUser.id}/anonymize`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body.anonymized).toBe(true);
    // update should replace email/name, not delete the user row
    expect(pm.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymizedAt: expect.any(Date) }),
      }),
    );
  });

  it('cannot anonymize twice', async () => {
    const alreadyAnon = {
      id: 'already-anon-uuid',
      email: 'deleted-xxx@anonymized.invalid',
      name: 'Deleted User',
      anonymizedAt: new Date(Date.now() - 60_000),
    };
    pm.user.findUnique.mockResolvedValue(alreadyAnon);

    const res = await request(app)
      .post(`/api/admin/users/${alreadyAnon.id}/anonymize`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(409);
  });
});
