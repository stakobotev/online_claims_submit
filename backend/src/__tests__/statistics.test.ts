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
  return `Bearer ${signAccessToken({ sub: 'admin-uuid-stat', email: 'admin@stat.com', role: 'admin' })}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── BRD §10/§19 scenario: statistics dashboard reflects new complaint ────────
describe('GET /api/statistics/summary', () => {
  it('statistics dashboard reflects new complaint — returns correct aggregate shape', async () => {
    pm.complaint.count
      .mockResolvedValueOnce(1234)  // totalComplaints
      .mockResolvedValueOnce(1200); // totalForwarded
    pm.complaint.groupBy
      .mockResolvedValueOnce([
        { categoryId: 'hospitals', _count: { id: 800 } },
        { categoryId: 'doctors', _count: { id: 300 } },
        { categoryId: 'insurance_funds', _count: { id: 134 } },
      ])
      .mockResolvedValueOnce([
        { urgent: true, _count: { id: 100 } },
        { urgent: false, _count: { id: 1134 } },
      ]);

    const res = await request(app).get('/api/statistics/summary');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalComplaints', 1234);
    expect(res.body).toHaveProperty('totalForwarded', 1200);
    expect(Array.isArray(res.body.byCategory)).toBe(true);
    expect(res.body.byCategory.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('byUrgency');
    expect(res.body.byUrgency).toHaveProperty('urgent');
    expect(res.body.byUrgency).toHaveProperty('normal');
  });

  it('summary is publicly accessible without auth', async () => {
    pm.complaint.count.mockResolvedValue(0);
    pm.complaint.groupBy.mockResolvedValue([]);

    const res = await request(app).get('/api/statistics/summary');

    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/statistics/detail', () => {
  it('admin detail has byStatus, byMonth, bySubmissionType breakdowns', async () => {
    pm.complaint.groupBy
      .mockResolvedValueOnce([{ status: 'forwarded', _count: { id: 1200 } }]) // byStatus
      .mockResolvedValueOnce([{ institutionId: 'inst-1', _count: { id: 50 } }]) // byInstitution
      .mockResolvedValueOnce([{ submissionType: 'authenticated', _count: { id: 900 } }]); // bySubmissionType
    pm.$queryRawUnsafe.mockResolvedValue([{ month: '2026-01', count: '100' }]);

    const res = await request(app)
      .get('/api/admin/statistics/detail')
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byStatus');
    expect(res.body).toHaveProperty('byMonth');
    expect(res.body).toHaveProperty('bySubmissionType');
    expect(Array.isArray(res.body.byStatus)).toBe(true);
    expect(Array.isArray(res.body.byMonth)).toBe(true);
  });

  it('non-admin cannot access admin statistics', async () => {
    const userTok = `Bearer ${signAccessToken({ sub: 'u1', email: 'u@test.com', role: 'user' })}`;
    const res = await request(app)
      .get('/api/admin/statistics/detail')
      .set('Authorization', userTok);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/statistics/export', () => {
  it('export csv returns Content-Type text/csv', async () => {
    pm.complaint.findMany.mockResolvedValue([
      {
        publicId: 'VLC-2026-000001',
        status: 'forwarded',
        categoryId: 'hospitals',
        submissionType: 'authenticated',
        urgent: false,
        createdAt: new Date('2026-01-15'),
        forwardedAt: new Date('2026-01-15'),
        closedAt: null,
      },
    ]);

    const res = await request(app)
      .get('/api/admin/statistics/export?format=csv')
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/i);
  });

  it('export pdf returns Content-Type application/pdf', async () => {
    pm.complaint.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/admin/statistics/export?format=pdf')
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/i);
  });

  it('non-admin cannot export statistics', async () => {
    const userTok = `Bearer ${signAccessToken({ sub: 'u2', email: 'u2@test.com', role: 'user' })}`;
    const res = await request(app)
      .get('/api/admin/statistics/export?format=csv')
      .set('Authorization', userTok);

    expect(res.status).toBe(403);
  });
});
