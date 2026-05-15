import { http, HttpResponse } from 'msw';

const BASE = '/api';


export const handlers = [
  http.get(`${BASE}/config/public`, () =>
    HttpResponse.json({
      minBodyLength: 100,
      maxAttachments: 3,
      maxAttachmentTotalBytes: 5242880,
      allowedAttachmentMime: ['application/pdf', 'image/bmp', 'image/jpeg', 'image/png', 'image/tiff'],
      captchaSiteKey: '10000000-ffff-ffff-ffff-000000000001',
      oauthProviders: ['google', 'facebook'],
      locales: ['en', 'bg'],
    }),
  ),

  http.get(`${BASE}/categories`, () =>
    HttpResponse.json([
      { id: 'hospitals', name: 'Hospitals' },
      { id: 'doctors', name: 'Doctors' },
      { id: 'insurance_funds', name: 'Health Insurance Funds' },
    ]),
  ),

  http.get(`${BASE}/institutions`, () =>
    HttpResponse.json({
      data: [
        { id: 'inst-1', categoryId: 'hospitals', name: 'City Hospital', email: 'hospital@example.com', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'inst-2', categoryId: 'doctors', name: 'Dr. Smith', email: 'smith@example.com', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      total: 2,
      page: 1,
      size: 20,
      pages: 1,
    }),
  ),

  http.post(`${BASE}/complaints`, () =>
    HttpResponse.json(
      {
        publicId: 'VLC-2026-000001',
        status: 'pending_review',
        message: 'Your complaint has been submitted and is pending review.',
      },
      { status: 201 },
    ),
  ),

  http.get(`${BASE}/statistics/summary`, () =>
    HttpResponse.json({
      totalComplaints: 1234,
      totalForwarded: 1200,
      byCategory: [
        { id: 'hospitals', count: 800 },
        { id: 'doctors', count: 300 },
        { id: 'insurance_funds', count: 134 },
      ],
      byUrgency: { urgent: 100, normal: 1134 },
    }),
  ),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'admin@vallentin.local' && body.password === 'ChangeMe!Now1') {
      return HttpResponse.json({
        accessToken: 'mock-access-token',
        user: { id: 'admin-1', email: 'admin@vallentin.local', name: 'Admin', role: 'admin' },
      });
    }
    if (body.email === 'user@test.com' && body.password === 'Test1234!') {
      return HttpResponse.json({
        accessToken: 'mock-user-token',
        user: { id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'user' },
      });
    }
    return HttpResponse.json(
      { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } },
      { status: 401 },
    );
  }),

  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json({ userId: 'new-user-1', status: 'pending_confirmation' }, { status: 201 }),
  ),

  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'No refresh token' } },
      { status: 401 },
    ),
  ),

  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/auth/forgot-password`, () => HttpResponse.json({})),

  http.get(`${BASE}/complaints`, () =>
    HttpResponse.json({
      data: [],
      total: 0,
      page: 1,
      size: 10,
      pages: 0,
    }),
  ),

  http.get(`${BASE}/admin/statistics/detail`, () =>
    HttpResponse.json({
      totalComplaints: 1234,
      totalForwarded: 1200,
      byCategory: [{ id: 'hospitals', count: 800 }],
      byUrgency: { urgent: 100, normal: 1134 },
      byStatus: [{ status: 'forwarded', count: 1200 }],
      byMonth: [{ month: '2026-01', count: 100 }],
      bySubmissionType: [{ type: 'authenticated', count: 900 }, { type: 'anonymous', count: 334 }],
      byInstitution: [],
    }),
  ),

  http.get(`${BASE}/admin/complaints/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    if (q) {
      return HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 });
    }
    return HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 });
  }),

  http.post(`${BASE}/admin/complaints/:publicId/approve`, () =>
    HttpResponse.json({ message: 'Complaint approved and forwarded.' }),
  ),

  http.post(`${BASE}/admin/complaints/:publicId/reject`, () =>
    HttpResponse.json({ message: 'Complaint rejected.' }),
  ),

  http.patch(`${BASE}/admin/complaints/:publicId/status`, () =>
    HttpResponse.json({ message: 'Status updated.' }),
  ),

  http.get(`${BASE}/admin/complaints/:publicId/events`, () =>
    HttpResponse.json([]),
  ),

  http.post(`${BASE}/auth/reset-password`, () =>
    HttpResponse.json({ message: 'Password reset.' }),
  ),

  http.get(`${BASE}/me`, () =>
    HttpResponse.json({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      anonymizedAt: null,
    }),
  ),
];
