import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { resetPassword } from '../../api/auth';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;

const schema = z
  .object({
    password: z.string().regex(PASSWORD_REGEX, 'Password must meet complexity requirements'),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Passwords do not match',
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await resetPassword({ token, password: data.password, passwordConfirmation: data.passwordConfirmation });
      navigate('/auth/login?reset=1');
    } catch (err) {
      const e = err as { message?: string };
      setServerError(e.message ?? t('errors.generic'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      <FormField
        label={t('auth.newPassword', 'New password')}
        htmlFor="rp-pass"
        error={errors.password?.message}
        required
        hint={t('auth.passwordHint', 'Min 8 chars with upper, lower, digit and special character')}
      >
        <Input id="rp-pass" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      </FormField>
      <FormField label={t('auth.passwordConfirmation', 'Confirm password')} htmlFor="rp-confirm" error={errors.passwordConfirmation?.message} required>
        <Input id="rp-confirm" type="password" autoComplete="new-password" error={errors.passwordConfirmation?.message} {...register('passwordConfirmation')} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        {t('auth.resetPassword', 'Reset password')}
      </Button>
    </form>
  );
}
