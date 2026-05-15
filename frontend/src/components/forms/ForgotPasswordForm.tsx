import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { forgotPassword } from '../../api/auth';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

const HCAPTCHA_SITE_KEY =
  import.meta.env['VITE_HCAPTCHA_SITE_KEY'] ?? '10000000-ffff-ffff-ffff-000000000001';

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!captchaToken) {
      setServerError(t('auth.captchaRequired', 'Please complete the CAPTCHA'));
      return;
    }
    setServerError(null);
    try {
      await forgotPassword(data.email, captchaToken);
      setSent(true);
    } catch (err) {
      const e = err as { message?: string };
      setServerError(e.message ?? t('errors.generic'));
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-2">
        <div className="text-5xl">📧</div>
        <p className="text-gray-700">{t('auth.forgotSent', 'If that email exists, a reset link has been sent.')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      <FormField label={t('auth.email', 'Email')} htmlFor="fp-email" error={errors.email?.message} required>
        <Input id="fp-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      </FormField>
      <div>
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        {t('auth.sendResetLink', 'Send reset link')}
      </Button>
    </form>
  );
}
