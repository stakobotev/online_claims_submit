import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exchangeOAuthCode } from '../../api/auth';
import { useAuthStore } from '../../stores/auth';
import { setAuthToken } from '../../api/client';
import { Spinner } from '../../components/ui/Spinner';

export function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    if (!code) {
      navigate('/auth/login?error=oauth');
      return;
    }

    exchangeOAuthCode(code)
      .then((data) => {
        setAuth(data.user, data.accessToken);
        setAuthToken(data.accessToken);
        const fromParam = searchParams.get('from');
        const safe = fromParam && /^\/(?!\/)/.test(fromParam) ? fromParam : '/';
        navigate(safe, { replace: true });
      })
      .catch(() => {
        navigate('/auth/login?error=oauth');
      });
  }, [navigate, searchParams, setAuth]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600">{t('auth.oauthProcessing', 'Completing sign-in...')}</p>
      </div>
    </div>
  );
}
