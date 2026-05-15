import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LoginForm } from '../../components/forms/LoginForm';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('LoginForm validation', () => {
  it('shows error when submitting empty form', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('shows error on invalid email format', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/email/i), 'not-valid');
    await userEvent.type(screen.getByLabelText(/password/i), 'somepass');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('shows server error on bad credentials', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'WrongPass!1');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(
      () => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
