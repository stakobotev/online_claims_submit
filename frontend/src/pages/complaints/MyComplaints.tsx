import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyComplaints } from '../../hooks/useComplaints';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Pagination } from '../../components/ui/Pagination';
import { buttonClass } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';

const PAGE_SIZE = 10;

export function MyComplaints() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyComplaints({ page, size: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.myComplaints')}</h1>
        <Link to="/complaints/submit" className={buttonClass('primary', 'md')}>
          {t('home.cta.submit', 'Submit a complaint')}
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}

      {isError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {t('errors.generic')}
        </div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <EmptyState
          title={t('complaint.noComplaints', 'No complaints yet')}
          description={t('complaint.noComplaintsDesc', 'Submit your first complaint using the button above.')}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="space-y-3">
            {data.data.map((c) => (
              <Link
                key={c.id}
                to={`/complaints/${c.publicId}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-400">{c.publicId}</p>
                    <p className="mt-0.5 font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(c.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                    {c.urgent && (
                      <span className="text-xs text-red-600 font-medium">{t('complaint.urgent', 'Urgent')}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
