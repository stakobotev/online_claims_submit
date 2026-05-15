import { useTranslation } from 'react-i18next';

export function Privacy() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('privacy.title', 'Privacy Policy')}</h1>
      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.section1.title', 'Data we collect')}</h2>
          <p>{t('privacy.section1.body', 'We collect your email address and name when you register. For complaint submissions, we may collect contact details you provide voluntarily. We also retain your IP address for abuse prevention.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.section2.title', 'How we use your data')}</h2>
          <p>{t('privacy.section2.body', 'Your data is used to process your complaint, notify you of its status, and forward it to the relevant institution. We do not sell your personal data.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.section3.title', 'Your rights (GDPR)')}</h2>
          <p>{t('privacy.section3.body', 'You have the right to access, rectify, or erase your personal data. Contact an administrator to exercise these rights. Anonymous submissions cannot be linked back to you once submitted.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.section4.title', 'Data retention')}</h2>
          <p>{t('privacy.section4.body', 'Complaint records are retained for a minimum period required by law. Account data may be erased on request, subject to legal obligations.')}</p>
        </section>
        <p className="text-sm text-gray-400">{t('privacy.version', 'Version 1.0 — May 2026')}</p>
      </div>
    </div>
  );
}
