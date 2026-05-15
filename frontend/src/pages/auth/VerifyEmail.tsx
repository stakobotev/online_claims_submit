import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { Spinner } from '../../components/ui/Spinner';
import { buttonClass } from '../../components/ui/Button';
import { resendVerification } from '../../api/auth';

export function VerifyEmail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resent, setResent] = useState(false);
  const [resentEmail, setResentEmail] = useState('');

  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    apiClient
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.checkEmail', 'Check your email')}</h1>
          <p className="text-gray-600">{t('auth.verifyEmailSent', 'We sent a verification link to your email address. Please click it to activate your account.')}</p>
          <div className="space-y-2 pt-4">
            <p className="text-sm text-gray-500">{t('auth.didntReceive', "Didn't receive it?")}</p>
            {!resent ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resentEmail) return;
                  await resendVerification(resentEmail);
                  setResent(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={resentEmail}
                  onChange={(e) => setResentEmail(e.target.value)}
                  placeholder={t('auth.email', 'Email')}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button type="submit" className={buttonClass('primary', 'sm')}>
                  {t('auth.resend', 'Resend')}
                </button>
              </form>
            ) : (
              <p className="text-sm text-green-600">{t('auth.resentSuccess', 'Resent! Check your inbox.')}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        {status === 'loading' && <Spinner size="lg" />}
        {status === 'success' && (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.emailVerified', 'Email verified')}</h1>
            <p className="text-gray-600">{t('auth.emailVerifiedDesc', 'Your account is now active. You can log in.')}</p>
            <Link to="/auth/login" className={buttonClass('primary', 'md')}>
              {t('nav.login')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.verifyFailed', 'Verification failed')}</h1>
            <p className="text-gray-600">{t('auth.verifyFailedDesc', 'The link is invalid or has expired.')}</p>
            <Link to="/auth/login" className={buttonClass('outline', 'md')}>
              {t('nav.login')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
