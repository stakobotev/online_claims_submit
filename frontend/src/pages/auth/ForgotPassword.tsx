import { useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '../../components/forms/ForgotPasswordForm';
import { Card, CardBody } from '../../components/ui/Card';

export function ForgotPassword() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('auth.forgotPassword', 'Forgot your password?')}</h1>
        <p className="text-sm text-gray-500 text-center mb-6">{t('auth.forgotDesc', 'Enter your email and we will send a reset link.')}</p>
        <Card>
          <CardBody>
            <ForgotPasswordForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
