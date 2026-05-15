import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { refresh } from './api/auth';
import { useAuthStore } from './stores/auth';
import { setAuthToken } from './api/client';

function BootstrapAuth() {
  const { setAuth, clearAuth, setBootstrapped } = useAuthStore();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    refresh()
      .then((data) => {
        setAuth(data.user, data.accessToken);
        setAuthToken(data.accessToken);
      })
      .catch(() => {
        clearAuth();
        setAuthToken(null);
      })
      .finally(() => {
        setBootstrapped();
      });
  }, [setAuth, clearAuth, setBootstrapped]);

  return null;
}

export function App() {
  return (
    <>
      <BootstrapAuth />
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </>
  );
}
