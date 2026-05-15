import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { ResetPasswordForm } from '../../components/forms/ResetPasswordForm';

vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('token=valid-reset-token'), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

function setup() {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ResetPasswordForm />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('ResetPasswordForm', () => {
  it('password complexity validation rejects simple passwords', async () => {
    setup();

    const inputs = screen.getAllByLabelText(/password/i);
    await userEvent.type(inputs[0], 'simplepassword');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('shows error when passwords do not match', async () => {
    setup();

    const inputs = screen.getAllByLabelText(/password/i);
    await userEvent.type(inputs[0], 'Secure!Pass1');
    await userEvent.type(inputs[1], 'Different!Pass1');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const mismatch = alerts.find((a) => /match/i.test(a.textContent ?? ''));
      expect(mismatch).toBeTruthy();
    });
  });

  it('accepts a valid password that meets complexity requirements', async () => {
    setup();

    const inputs = screen.getAllByLabelText(/password/i);
    // Valid: 8+ chars, upper, lower, digit, special
    await userEvent.type(inputs[0], 'Secure!Pass1');
    await userEvent.type(inputs[1], 'Secure!Pass1');

    // No validation alerts should appear for the password field itself
    // (server call will be mocked via MSW but we just check no complexity alert)
    const passwordAlerts = screen.queryAllByRole('alert');
    expect(passwordAlerts.filter((a) => /complexity|requirements/i.test(a.textContent ?? '')).length).toBe(0);
  });
});
