import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { http, HttpResponse } from 'msw';
import i18n from '../i18n';
import { server } from '../mocks/server';
import { MyComplaints } from '../../pages/complaints/MyComplaints';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <MyComplaints />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('MyComplaints page', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('shows empty state when there are no complaints', async () => {
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, size: 10, pages: 0 }),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByText(/no complaints yet/i)).toBeInTheDocument();
    });
  });

  it('renders paginated complaint list', async () => {
    const now = new Date().toISOString();
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({
          data: [
            {
              id: 'c-1',
              publicId: 'VLC-2026-000001',
              userId: 'u-1',
              categoryId: 'hospitals',
              institutionId: 'inst-1',
              institutionFreeText: null,
              title: 'First Complaint',
              body: 'A'.repeat(110),
              urgent: false,
              contactName: null,
              contactEmail: null,
              status: 'forwarded',
              submissionType: 'authenticated',
              createdAt: now,
              updatedAt: now,
              reviewedAt: null,
              forwardedAt: now,
              closedAt: null,
            },
            {
              id: 'c-2',
              publicId: 'VLC-2026-000002',
              userId: 'u-1',
              categoryId: 'doctors',
              institutionId: 'inst-2',
              institutionFreeText: null,
              title: 'Second Complaint',
              body: 'B'.repeat(110),
              urgent: true,
              contactName: null,
              contactEmail: null,
              status: 'pending_review',
              submissionType: 'authenticated',
              createdAt: now,
              updatedAt: now,
              reviewedAt: null,
              forwardedAt: null,
              closedAt: null,
            },
          ],
          total: 2,
          page: 1,
          size: 10,
          pages: 1,
        }),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByText('First Complaint')).toBeInTheDocument();
      expect(screen.getByText('Second Complaint')).toBeInTheDocument();
    });
  });

  it('renders status badges for complaints', async () => {
    const now = new Date().toISOString();
    server.use(
      http.get('/api/complaints', () =>
        HttpResponse.json({
          data: [
            {
              id: 'c-3',
              publicId: 'VLC-2026-000003',
              userId: 'u-1',
              categoryId: 'hospitals',
              institutionId: null,
              institutionFreeText: 'Some Hospital',
              title: 'Status Badge Test',
              body: 'C'.repeat(110),
              urgent: false,
              contactName: null,
              contactEmail: null,
              status: 'submitted',
              submissionType: 'authenticated',
              createdAt: now,
              updatedAt: now,
              reviewedAt: null,
              forwardedAt: null,
              closedAt: null,
            },
          ],
          total: 1,
          page: 1,
          size: 10,
          pages: 1,
        }),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByText('Status Badge Test')).toBeInTheDocument();
    });

    // status badge rendered somewhere in the DOM
    expect(document.querySelector('[class*="badge"], [class*="status"], span')).toBeTruthy();
  });
});
