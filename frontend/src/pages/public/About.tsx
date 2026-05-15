import { useTranslation } from 'react-i18next';

export function About() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('about.title', 'About Vallentin Claims')}</h1>
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>{t('about.p1', 'Vallentin Claims is a web-based platform that allows citizens to submit complaints against healthcare institutions — hospitals, doctors, and health insurance funds.')}</p>
        <p>{t('about.p2', 'Complaints submitted by registered users are forwarded immediately to the relevant institution and a copy is sent to the Ombudsman. Anonymous submissions are reviewed by an administrator first.')}</p>
        <p>{t('about.p3', 'The platform is designed with privacy and security in mind. Personal data is handled in accordance with GDPR.')}</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">{t('about.contact', 'Contact')}</h2>
        <p>{t('about.contactText', 'For questions or assistance, please reach out via the complaint tracking system.')}</p>
      </div>
    </div>
  );
}
