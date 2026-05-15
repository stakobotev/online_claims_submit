import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonClass } from '../components/ui/Button';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-primary-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('errors.notFound')}</h1>
      <p className="mt-2 text-gray-500">{t('errors.notFoundDesc', 'The page you are looking for does not exist.')}</p>
      <Link to="/" className={`${buttonClass('primary', 'md')} mt-6`}>
        {t('actions.back')}
      </Link>
    </div>
  );
}
