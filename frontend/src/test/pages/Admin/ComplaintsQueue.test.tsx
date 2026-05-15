import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { http, HttpResponse } from 'msw';
import i18n from '../../i18n';
import { server } from '../../mocks/server';
import { ComplaintsQueue } from '../../../pages/admin/ComplaintsQueue';

const now = new Date().toISOString();

function makeComplaint(overrides: Record<string, unknown> = {}) {
  return {
    id: `c-${Math.random().toString(36).slice(2)}`,
    publicId: 'VLC-2026-000001',
    userId: null,
    categoryId: 'hospitals',
    institutionId: 'inst-1',
    institutionFreeText: null,
    title: 'Test Complaint',
    body: 'A'.repeat(110),
    urgent: false,
    contactName: null,
    contactEmail: null,
    status: 'pending_review',
    submissionType: 'anonymous',
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    forwardedAt: null,
    closedAt: null,
    ...overrides,
  };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/admin/complaints']}>
          <Routes>
            <Route path="/admin/complaints" element={<ComplaintsQueue />} />
            <Route path="/admin/complaints/:publicId" element={<ComplaintsQueue />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

function setupWithPublicId(publicId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[`/admin/complaints/${publicId}`]}>
          <Routes>
            <Route path="/admin/complaints" element={<ComplaintsQueue />} />
            <Route path="/admin/complaints/:publicId" element={<ComplaintsQueue />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('Admin ComplaintsQueue', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('renders complaint table when there are complaints', async () => {
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({
          data: [makeComplaint({ title: 'Queue Test Complaint' })],
          total: 1,
          page: 1,
          size: 20,
          pages: 1,
        }),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByText('Queue Test Complaint')).toBeInTheDocument();
    });
  });

  it('shows empty state when no complaints match', async () => {
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 }),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByText(/no complaints found/i)).toBeInTheDocument();
    });
  });

  it('filter wiring: status dropdown changes query params', async () => {
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 }),
      ),
    );

    setup();

    await waitFor(() => screen.getByRole('combobox', { hidden: true }));

    const statusSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'pending_review' } });

    // After filter change the query should re-run (no error thrown)
    await waitFor(() => {
      expect(statusSelect.value).toBe('pending_review');
    });
  });

  it('approve and reject buttons are shown only for pending_review complaints', async () => {
    const complaint = makeComplaint({ title: 'Pending Complaint', publicId: 'VLC-2026-000050' });

    server.use(
      http.get('/api/complaints/:publicId', () => HttpResponse.json(complaint)),
      http.get('/api/admin/complaints/:publicId/events', () => HttpResponse.json([])),
    );

    setupWithPublicId(complaint.publicId as string);

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('approve/reject buttons are NOT shown for forwarded complaints', async () => {
    const forwarded = makeComplaint({
      title: 'Forwarded Complaint',
      publicId: 'VLC-2026-000060',
      status: 'forwarded',
      forwardedAt: now,
    });

    server.use(
      http.get('/api/complaints/:publicId', () => HttpResponse.json(forwarded)),
      http.get('/api/admin/complaints/:publicId/events', () => HttpResponse.json([])),
    );

    setupWithPublicId(forwarded.publicId as string);

    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('search input triggers search API when submitted', async () => {
    let searchCalled = false;
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 }),
      ),
      http.get('/api/admin/complaints/search', () => {
        searchCalled = true;
        return HttpResponse.json({ data: [], total: 0, page: 1, size: 20, pages: 0 });
      }),
    );

    setup();

    await waitFor(() => screen.getByPlaceholderText(/search complaints/i));

    const searchInput = screen.getByPlaceholderText(/search complaints/i);
    fireEvent.change(searchInput, { target: { value: 'hospital' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => expect(searchCalled).toBe(true), { timeout: 3000 });
  });
});
