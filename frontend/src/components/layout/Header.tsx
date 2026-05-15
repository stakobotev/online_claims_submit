import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../hooks/useAuth';
import { Button, buttonClass } from '../ui/Button';

export function Header() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'bg' : 'en');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-primary-700' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-primary-700 text-lg">
          {t('app.name')}
        </Link>

        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClass}>{t('nav.home')}</NavLink>
          <NavLink to="/complaints/submit" className={navLinkClass}>{t('nav.submit', 'Submit')}</NavLink>
          {user && (
            <NavLink to="/complaints" className={navLinkClass}>{t('nav.myComplaints')}</NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>{t('nav.admin')}</NavLink>
          )}
          <NavLink to="/about" className={navLinkClass}>{t('nav.about')}</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Switch language"
          >
            {i18n.language === 'en' ? 'BG' : 'EN'}
          </button>

          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name ?? user.email}</span>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/auth/login" className={buttonClass('ghost', 'sm')}>
                {t('nav.login')}
              </Link>
              <Link to="/auth/register" className={buttonClass('primary', 'sm')}>
                {t('nav.register')}
              </Link>
            </div>
          )}

          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-3">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.home')}</NavLink>
          <NavLink to="/complaints/submit" className={navLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.submit', 'Submit')}</NavLink>
          {user && (
            <NavLink to="/complaints" className={navLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.myComplaints')}</NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.admin')}</NavLink>
          )}
          <NavLink to="/about" className={navLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.about')}</NavLink>
          <div className="pt-2 border-t border-gray-100">
            {user ? (
              <Button variant="outline" size="sm" onClick={() => { setMenuOpen(false); void logout(); }}>
                {t('nav.logout')}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Link to="/auth/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600">{t('nav.login')}</Link>
                <Link to="/auth/register" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-primary-600">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
