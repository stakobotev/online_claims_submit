import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ComplaintForm } from '../../components/forms/ComplaintForm';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { buttonClass } from '../../components/ui/Button';
import type { SubmitComplaintResponse } from '../../api/complaints';

export function Submit() {
  const { t } = useTranslation();
  const [result, setResult] = useState<SubmitComplaintResponse | null>(null);

  if (result) {
    const isPending = result.status === 'pending_review';
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardBody className="text-center space-y-4 py-10">
            <div className="text-5xl">{isPending ? '⏳' : '✅'}</div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('complaint.submitted.title', 'Complaint submitted')}
            </h1>
            <p className="text-gray-700 font-mono text-lg font-semibold">{result.publicId}</p>
            <div className={`rounded-md px-4 py-3 text-sm ${isPending ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              {isPending
                ? t('complaint.submitted.anonymous', 'Your complaint is pending admin review before being forwarded to the institution.')
                : t('complaint.submitted.authorized', 'Your complaint has been received and forwarded to the institution immediately.')}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link to={`/track/${result.publicId}`} className={buttonClass('outline', 'md')}>
                {t('complaint.submitted.track', 'Track complaint')}
              </Link>
              <button
                onClick={() => setResult(null)}
                className={buttonClass('primary', 'md')}
              >
                {t('complaint.submitted.another', 'Submit another')}
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t('complaint.submitTitle', 'Submit a complaint')}</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {t('complaint.submitDesc', 'Fill in the form below. Anonymous submissions are reviewed before forwarding; registered users are forwarded immediately.')}
          </p>
        </CardHeader>
        <CardBody>
          <ComplaintForm onSuccess={setResult} />
        </CardBody>
      </Card>
    </div>
  );
}
