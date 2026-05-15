import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getStatsSummary } from '../../api/statistics';
import { Card, CardBody } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { buttonClass } from '../../components/ui/Button';

export function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: getStatsSummary,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard', 'Dashboard')}</h1>
        <Link to="/admin/complaints" className={buttonClass('primary', 'md')}>
          {t('admin.viewComplaints', 'View complaints')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-primary-700">{stats.totalComplaints}</p>
              <p className="text-sm text-gray-500">{t('stats.totalComplaints', 'Total complaints')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.totalForwarded}</p>
              <p className="text-sm text-gray-500">{t('stats.forwarded', 'Forwarded')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.byUrgency.urgent}</p>
              <p className="text-sm text-gray-500">{t('stats.urgent', 'Urgent')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-gray-700">{stats.byUrgency.normal}</p>
              <p className="text-sm text-gray-500">{t('stats.normal', 'Normal')}</p>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/admin/complaints', label: t('admin.nav.complaints', 'Complaints') },
          { to: '/admin/users', label: t('admin.nav.users', 'Users') },
          { to: '/admin/institutions', label: t('admin.nav.institutions', 'Institutions') },
        ].map(({ to, label }) => (
          <Card key={to} className="hover:border-primary-300 transition-colors">
            <CardBody>
              <Link to={to} className="block font-medium text-primary-700 hover:underline">
                {label} →
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
