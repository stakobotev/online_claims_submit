import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useComplaint } from '../../hooks/useComplaints';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { formatDateTime, publicIdPattern } from '../../utils/formatters';
import type { ComplaintStatus } from '../../types';

const STATUS_ORDER: ComplaintStatus[] = ['submitted', 'pending_review', 'forwarded', 'closed'];

function TrackResult({ publicId }: { publicId: string }) {
  const { t } = useTranslation();
  const { data: complaint, isLoading, isError, error } = useComplaint(publicId);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  if (isError) {
    const e = error as { status?: number };
    return (
      <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
        {e?.status === 404 || e?.status === 403
          ? t('track.notFound', 'Complaint not found or you do not have access. Sign in to track your submissions.')
          : t('errors.generic')}
        {' '}
        <Link to="/auth/login" className="underline text-primary-600">{t('nav.login')}</Link>
      </div>
    );
  }

  if (!complaint) return null;

  const statusForProgress: ComplaintStatus =
    complaint.status === 'rejected' ? 'pending_review'
    : complaint.status === 'approved' ? 'forwarded'
    : complaint.status;
  const currentIdx = STATUS_ORDER.indexOf(statusForProgress);

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="font-mono text-primary-700 font-semibold">{complaint.publicId}</p>
          <StatusBadge status={complaint.status} />
        </div>
        <p className="font-medium text-gray-900">{complaint.title}</p>
        <p className="text-sm text-gray-500">{t('complaint.submitted', 'Submitted')}: {formatDateTime(complaint.createdAt)}</p>

        <div className="flex items-center">
          {STATUS_ORDER.map((step, i) => {
            const idx = STATUS_ORDER.indexOf(step);
            const done = idx <= currentIdx;
            const isLast = i === STATUS_ORDER.length - 1;
            return (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="mt-1 text-xs text-center max-w-[64px] text-gray-500 leading-tight">
                    {t(`status.${step}`, step.replace('_', ' '))}
                  </span>
                </div>
                {!isLast && <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export function Track() {
  const { t } = useTranslation();
  const { publicId: paramId } = useParams<{ publicId?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [activeId, setActiveId] = useState<string>(paramId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = input.trim().toUpperCase();
    if (publicIdPattern().test(id)) {
      setActiveId(id);
      navigate(`/track/${id}`, { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('track.title', 'Track a complaint')}</h1>

      {!paramId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('track.placeholder', 'Enter complaint ID (e.g. VLC-2026-000123)')}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('track.inputLabel', 'Complaint ID')}
          />
          <Button type="submit">{t('track.action', 'Track')}</Button>
        </form>
      )}

      {activeId && <TrackResult publicId={activeId} />}
    </div>
  );
}
