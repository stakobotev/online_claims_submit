import { useTranslation } from 'react-i18next';
import { ResetPasswordForm } from '../../components/forms/ResetPasswordForm';
import { Card, CardBody } from '../../components/ui/Card';

export function ResetPassword() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('auth.resetPassword', 'Reset your password')}</h1>
        <Card>
          <CardBody>
            <ResetPasswordForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
