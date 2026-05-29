import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await login(data);
      const fromParam = searchParams.get('from');
      const safe = fromParam && /^\/(?!\/)/.test(fromParam) ? fromParam : '/';
      navigate(safe, { replace: true });
    } catch (err) {
      const e = err as { message?: string; code?: string };
      if (e.code === 'AUTH_INVALID_CREDENTIALS') {
        setServerError(t('auth.invalidCredentials', 'Invalid email or password.'));
      } else {
        setServerError(e.message ?? t('errors.generic'));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <FormField label={t('auth.email', 'Email')} htmlFor="login-email" error={errors.email?.message} required>
        <Input id="login-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      </FormField>

      <FormField label={t('auth.password', 'Password')} htmlFor="login-password" error={errors.password?.message} required>
        <Input id="login-password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      </FormField>

      <div className="flex justify-end">
        <Link to="/auth/forgot-password" className="text-sm text-primary-600 hover:underline">
          {t('auth.forgotPassword', 'Forgot your password?')}
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting}>
        {t('nav.login')}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">{t('auth.orContinueWith', 'or continue with')}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/auth/oauth/google"
          className="flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Google
        </a>
        <a
          href="/api/auth/oauth/facebook"
          className="flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Facebook
        </a>
      </div>

      <p className="text-center text-sm text-gray-600">
        {t('auth.noAccount', "Don't have an account?")}{' '}
        <Link to="/auth/register" className="text-primary-600 hover:underline">{t('nav.register')}</Link>
      </p>
    </form>
  );
}
