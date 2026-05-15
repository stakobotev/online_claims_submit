import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { FormField } from '../ui/FormField';
import { toast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;

const schema = z
  .object({
    email: z.string().email(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().regex(PASSWORD_REGEX, 'Password must be ≥8 chars with upper, lower, digit and special character'),
    passwordConfirmation: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Use' }) }),
    marketing: z.boolean(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Passwords do not match',
  });

type FormData = z.infer<typeof schema>;

const HCAPTCHA_SITE_KEY =
  import.meta.env['VITE_HCAPTCHA_SITE_KEY'] ?? '10000000-ffff-ffff-ffff-000000000001';

export function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { terms: undefined, marketing: false },
  });

  const onSubmit = async (data: FormData) => {
    if (!captchaToken) {
      setServerError(t('auth.captchaRequired', 'Please complete the CAPTCHA'));
      return;
    }
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        name: data.name,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
        captchaToken,
        consents: {
          termsVersion: '1.0',
          privacyVersion: '1.0',
          marketing: data.marketing,
        },
      });
      navigate('/auth/verify-email');
    } catch (err) {
      const e = err as { message?: string; code?: string };
      if (e.code === 'CONFLICT') {
        setServerError(t('auth.emailInUse', 'This email is already registered.'));
      } else {
        setServerError(e.message ?? t('errors.generic'));
      }
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <FormField label={t('auth.email', 'Email')} htmlFor="reg-email" error={errors.email?.message} required>
        <Input id="reg-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      </FormField>

      <FormField label={t('auth.name', 'Full name')} htmlFor="reg-name" error={errors.name?.message} required>
        <Input id="reg-name" type="text" autoComplete="name" error={errors.name?.message} {...register('name')} />
      </FormField>

      <FormField label={t('auth.password', 'Password')} htmlFor="reg-password" error={errors.password?.message} required
        hint={t('auth.passwordHint', 'Min 8 chars, must include uppercase, lowercase, digit and special character')}>
        <Input id="reg-password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      </FormField>

      <FormField label={t('auth.passwordConfirmation', 'Confirm password')} htmlFor="reg-pc" error={errors.passwordConfirmation?.message} required>
        <Input id="reg-pc" type="password" autoComplete="new-password" error={errors.passwordConfirmation?.message} {...register('passwordConfirmation')} />
      </FormField>

      <div className="space-y-2 pt-2">
        <Checkbox
          id="reg-terms"
          label={
            <span>
              {t('auth.agreeTerms', 'I accept the')}{' '}
              <Link to="/terms" target="_blank" className="text-primary-600 underline">{t('nav.terms')}</Link>
              {' '}{t('auth.and', 'and')}{' '}
              <Link to="/privacy" target="_blank" className="text-primary-600 underline">{t('nav.privacy')}</Link>
            </span>
          }
          error={errors.terms?.message}
          {...register('terms')}
        />
        <Checkbox
          id="reg-marketing"
          label={t('auth.marketing', 'Send me product updates and news (optional)')}
          {...register('marketing')}
        />
      </div>

      <div className="pt-2">
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      <div className="space-y-3 pt-2">
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.registerAction', 'Create account')}
        </Button>
      </div>

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
        {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
        <Link to="/auth/login" className="text-primary-600 hover:underline">{t('nav.login')}</Link>
      </p>
    </form>
  );
}
