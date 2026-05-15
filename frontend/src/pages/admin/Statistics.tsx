import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { getStatsDetail, exportStatistics } from '../../api/statistics';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/Toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function Statistics() {
  const { t } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', from, to],
    queryFn: () => getStatsDetail({ from: from || undefined, to: to || undefined }),
  });

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      const blob = await exportStatistics({ format: exportFormat, from: from || undefined, to: to || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistics.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.nav.statistics', 'Statistics')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExport('csv')}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => void handleExport('pdf')}>Export PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600" htmlFor="stats-from">{t('admin.from', 'From')}</label>
        <input id="stats-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <label className="text-sm text-gray-600" htmlFor="stats-to">{t('admin.to', 'To')}</label>
        <input id="stats-to" type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By category */}
          {stats.byCategory && stats.byCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t('stats.byCategory', 'By category')}</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.byCategory} dataKey="count" nameKey="id" cx="50%" cy="50%" outerRadius={80}
                      label={(e: Record<string, unknown>) => `${String(e['id'])}: ${String(e['count'])}`}
                    >
                      {stats.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* By status */}
          {stats.byStatus && stats.byStatus.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t('stats.byStatus', 'By status')}</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Monthly trend */}
          {stats.byMonth && stats.byMonth.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>{t('stats.monthly', 'Monthly trend')}</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Top institutions */}
          {stats.byInstitution && stats.byInstitution.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>{t('stats.byInstitution', 'Top institutions')}</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.byInstitution.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* By submission type */}
          {stats.bySubmissionType && stats.bySubmissionType.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t('stats.bySubmissionType', 'By submission type')}</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.bySubmissionType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80}
                      label={(e: Record<string, unknown>) => `${String(e['type'])}: ${String(e['count'])}`}
                    >
                      {stats.bySubmissionType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
