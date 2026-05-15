import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useComplaint } from '../../hooks/useComplaints';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { buttonClass } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';
import type { ComplaintStatus } from '../../types';

const STATUS_ORDER: ComplaintStatus[] = ['submitted', 'pending_review', 'approved', 'forwarded', 'closed'];

export function ComplaintDetail() {
  const { t } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();
  const { data: complaint, isLoading, isError, error } = useComplaint(publicId ?? '');

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (isError) {
    const e = error as { status?: number };
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-4">
        <p className="text-gray-700">
          {e?.status === 404 || e?.status === 403
            ? t('complaint.notFound', 'Complaint not found or you do not have access. Sign in to track your submissions.')
            : t('errors.generic')}
        </p>
        <Link to="/" className={buttonClass('outline', 'md')}>
          {t('actions.back')}
        </Link>
      </div>
    );
  }

  if (!complaint) return null;

  const isRejected = complaint.status === 'rejected';
  const timelineSteps = isRejected
    ? (['submitted', 'pending_review', 'rejected'] as ComplaintStatus[])
    : STATUS_ORDER.filter(
        (s) => s !== 'pending_review' || complaint.submissionType === 'anonymous',
      );
  const REJECTED_ORDER: ComplaintStatus[] = ['submitted', 'pending_review', 'rejected'];
  const effectiveOrder = isRejected ? REJECTED_ORDER : STATUS_ORDER;
  const currentIdx = effectiveOrder.indexOf(complaint.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono text-sm text-gray-400">{complaint.publicId}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{complaint.title}</h1>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Status timeline */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            {timelineSteps.map((step, i) => {
              const idx = effectiveOrder.indexOf(step);
              const done = idx <= currentIdx;
              const isLast = i === timelineSteps.length - 1;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="mt-1 text-xs text-gray-500 text-center max-w-[72px] leading-tight">
                      {t(`status.${step}`, step.replace(/_/g, ' '))}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? 'bg-primary-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>{t('complaint.details', 'Complaint details')}</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t('complaint.category', 'Category')}</p>
              <p className="font-medium">{complaint.category?.name ?? complaint.categoryId}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('complaint.institution', 'Institution')}</p>
              <p className="font-medium">{complaint.institution?.name ?? complaint.institutionFreeText ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('complaint.submitted', 'Submitted')}</p>
              <p className="font-medium">{formatDateTime(complaint.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('complaint.type', 'Type')}</p>
              <p className="font-medium capitalize">{complaint.submissionType}</p>
            </div>
          </div>
          <hr className="border-gray-100" />
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('complaint.body', 'Description')}</p>
            <p className="text-gray-800 whitespace-pre-wrap">{complaint.body}</p>
          </div>
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{t('complaint.attachments', 'Attachments')}</p>
              <ul className="space-y-1">
                {complaint.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/api/attachments/${a.id}`}
                      className="text-sm text-primary-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.originalFilename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <Link to="/complaints" className={buttonClass('outline', 'md')}>
        {t('actions.back')}
      </Link>
    </div>
  );
}
