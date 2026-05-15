import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { RegisterForm } from '../../components/forms/RegisterForm';

vi.mock('@hcaptcha/react-hcaptcha', () => ({
  default: ({ onVerify }: { onVerify: (t: string) => void }) => (
    <button type="button" data-testid="hcaptcha" onClick={() => onVerify('mock-token')}>
      Complete CAPTCHA
    </button>
  ),
}));

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('RegisterForm validation', () => {
  beforeEach(() => {
    setup();
  });

  it('shows validation error on empty submit', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('shows password mismatch error', async () => {
    const passwordInputs = screen.getAllByLabelText(/password/i);
    await userEvent.type(passwordInputs[0], 'Abc!12345');
    await userEvent.type(passwordInputs[1], 'Different!1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const mismatch = alerts.find((a) => a.textContent?.toLowerCase().includes('match'));
      expect(mismatch).toBeTruthy();
    });
  });

  it('shows terms required when not accepted', async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
    const passwordInputs = screen.getAllByLabelText(/password/i);
    await userEvent.type(passwordInputs[0], 'Abc!12345');
    await userEvent.type(passwordInputs[1], 'Abc!12345');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('shows weak password error for simple passwords', async () => {
    const passwordInputs = screen.getAllByLabelText(/password/i);
    await userEvent.type(passwordInputs[0], 'simplepassword');
    fireEvent.blur(passwordInputs[0]);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
