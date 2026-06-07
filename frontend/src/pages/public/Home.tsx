import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getStatsSummary } from '../../api/statistics';
import { useAuthStore } from '../../stores/auth';
import { Card, CardBody } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { buttonClass } from '../../components/ui/Button';
import { publicIdPattern } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [trackInput, setTrackInput] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: getStatsSummary,
  });

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const id = trackInput.trim().toUpperCase();
    if (publicIdPattern().test(id)) {
      navigate(`/track/${id}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-20 px-4">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl font-bold sm:text-5xl">{t('home.hero.title', 'Healthcare complaint platform')}</h1>
          <p className="text-lg text-primary-100 max-w-2xl mx-auto">
            {t('home.hero.subtitle', 'Submit complaints against hospitals, doctors, and health insurance funds. Your complaint is forwarded to the relevant institution and the Ombudsman.')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/complaints/submit" className={buttonClass('secondary', 'lg')}>
              {t('home.cta.submit', 'Submit a complaint')}
            </Link>
            {!user && (
              <>
                <Link to="/auth/login" className={buttonClass('outline', 'lg', 'bg-transparent border-white text-white hover:bg-primary-800')}>
                  {t('nav.login')}
                </Link>
                <Link to="/auth/register" className={buttonClass('outline', 'lg', 'bg-transparent border-white text-white hover:bg-primary-800')}>
                  {t('nav.register')}
                </Link>
              </>
            )}
            {user && (
              <Link to="/complaints" className={buttonClass('outline', 'lg', 'bg-transparent border-white text-white hover:bg-primary-800')}>
                {t('nav.myComplaints')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Track section */}
      <section className="bg-gray-50 border-b border-gray-200 py-8 px-4">
        <div className="mx-auto max-w-xl">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder={t('home.track.placeholder', 'Track complaint: VLC-2026-000123')}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('home.track.label', 'Complaint ID')}
            />
            <button type="submit" className={buttonClass('primary', 'md')}>
              {t('home.track.action', 'Track')}
            </button>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('home.stats.title', 'Platform overview')}</h2>
          {isLoading ? (
            <div className="flex justify-center"><Spinner size="lg" /></div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card>
                <CardBody className="text-center">
                  <p className="text-4xl font-bold text-primary-700">{stats.totalComplaints.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('stats.totalComplaints', 'Total complaints')}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-4xl font-bold text-green-600">{stats.totalForwarded.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('stats.forwarded', 'Forwarded to institutions')}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-4xl font-bold text-yellow-600">{stats.byUrgency.urgent.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('stats.urgent', 'Marked urgent')}</p>
                </CardBody>
              </Card>

              {stats.byCategory.length > 0 && (
                <div className="sm:col-span-3">
                  <Card>
                    <CardBody>
                      <p className="text-sm font-medium text-gray-700 mb-4 text-center">{t('stats.byCategory', 'By category')}</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={stats.byCategory}
                            dataKey="count"
                            nameKey="id"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry: Record<string, unknown>) =>
                              `${String(entry['id'])} (${(Number(entry['percent']) * 100).toFixed(0)}%)`
                            }
                          >
                            {stats.byCategory.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('home.howItWorks.title', 'How it works')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-lg">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900">{t(`home.step${step}.title`, `Step ${step}`)}</h3>
                <p className="text-sm text-gray-500">{t(`home.step${step}.desc`, '')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
