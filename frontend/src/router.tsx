import { createBrowserRouter } from 'react-router-dom';
import { PageLayout } from './components/layout/PageLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { RequireAdmin } from './components/layout/RequireAdmin';

import { Home } from './pages/public/Home';
import { About } from './pages/public/About';
import { Privacy } from './pages/public/Privacy';
import { Terms } from './pages/public/Terms';
import { Track } from './pages/public/Track';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { OAuthCallback } from './pages/auth/OAuthCallback';

import { Submit } from './pages/complaints/Submit';
import { MyComplaints } from './pages/complaints/MyComplaints';
import { ComplaintDetail } from './pages/complaints/ComplaintDetail';

import { Dashboard } from './pages/admin/Dashboard';
import { ComplaintsQueue } from './pages/admin/ComplaintsQueue';
import { Users } from './pages/admin/Users';
import { Institutions } from './pages/admin/Institutions';
import { Statistics } from './pages/admin/Statistics';

import { NotFound } from './pages/NotFound';
import { Forbidden } from './pages/Forbidden';

export const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/about', element: <About /> },
      { path: '/privacy', element: <Privacy /> },
      { path: '/terms', element: <Terms /> },
      { path: '/track', element: <Track /> },
      { path: '/track/:publicId', element: <Track /> },

      { path: '/auth/login', element: <Login /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/verify-email', element: <VerifyEmail /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/reset-password', element: <ResetPassword /> },
      { path: '/auth/oauth/callback', element: <OAuthCallback /> },

      {
        path: '/complaints/submit',
        element: <Submit />,
      },
      {
        path: '/complaints',
        element: (
          <RequireAuth>
            <MyComplaints />
          </RequireAuth>
        ),
      },
      {
        path: '/complaints/:publicId',
        element: (
          <RequireAuth>
            <ComplaintDetail />
          </RequireAuth>
        ),
      },

      { path: '/403', element: <Forbidden /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { path: '/admin', element: <Dashboard /> },
      { path: '/admin/complaints', element: <ComplaintsQueue /> },
      { path: '/admin/complaints/:publicId', element: <ComplaintsQueue /> },
      { path: '/admin/users', element: <Users /> },
      { path: '/admin/institutions', element: <Institutions /> },
      { path: '/admin/statistics', element: <Statistics /> },
    ],
  },
]);
