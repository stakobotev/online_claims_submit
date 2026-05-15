import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonClass } from '../components/ui/Button';

export function Forbidden() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-red-200">403</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('errors.forbidden')}</h1>
      <Link to="/" className={`${buttonClass('outline', 'md')} mt-6`}>
        {t('actions.back')}
      </Link>
    </div>
  );
}
