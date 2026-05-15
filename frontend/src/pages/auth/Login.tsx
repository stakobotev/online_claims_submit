import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '../../components/forms/LoginForm';
import { Card, CardBody } from '../../components/ui/Card';

export function Login() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const reset = searchParams.get('reset');
  const oauthError = searchParams.get('error');

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('nav.login')}</h1>
        {reset && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {t('auth.passwordResetSuccess', 'Password reset successfully. Please log in.')}
          </div>
        )}
        {oauthError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {t('auth.oauthError', 'OAuth sign-in failed. Please try again.')}
          </div>
        )}
        <Card>
          <CardBody>
            <LoginForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
