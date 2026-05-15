import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Spinner } from '../ui/Spinner';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, accessToken, bootstrapped } = useAuthStore();
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !accessToken) {
    return <Navigate to={`/auth/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
