import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-display text-base font-semibold tracking-tight text-white">
            {t('app.name')}
          </p>
          <nav className="flex gap-6" aria-label="Footer navigation">
            <Link to="/about" className="text-sm text-white/70 hover:text-white transition-colors">{t('nav.about')}</Link>
            <Link to="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">{t('nav.privacy')}</Link>
            <Link to="/terms" className="text-sm text-white/70 hover:text-white transition-colors">{t('nav.terms')}</Link>
          </nav>
        </div>
        <p className="mt-6 border-t border-white/10 pt-6 text-xs text-white/50">
          &copy; {new Date().getFullYear()} {t('app.name')}
        </p>
      </div>
    </footer>
  );
}
