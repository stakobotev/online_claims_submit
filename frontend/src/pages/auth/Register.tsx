import { useTranslation } from 'react-i18next';
import { RegisterForm } from '../../components/forms/RegisterForm';
import { Card, CardBody } from '../../components/ui/Card';

export function Register() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('auth.createAccount', 'Create an account')}</h1>
        <Card>
          <CardBody>
            <RegisterForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
