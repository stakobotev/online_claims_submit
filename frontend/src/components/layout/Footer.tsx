import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t('app.name')}
          </p>
          <nav className="flex gap-6" aria-label="Footer navigation">
            <Link to="/about" className="text-sm text-gray-500 hover:text-gray-700">{t('nav.about')}</Link>
            <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-700">{t('nav.privacy')}</Link>
            <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-700">{t('nav.terms')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
