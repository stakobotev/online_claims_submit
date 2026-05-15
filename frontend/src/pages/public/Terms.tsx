import { useTranslation } from 'react-i18next';

export function Terms() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('terms.title', 'Terms of Use')}</h1>
      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.section1.title', 'Acceptable use')}</h2>
          <p>{t('terms.section1.body', 'You may use this platform to submit genuine complaints related to healthcare services. You must not submit false, abusive, or spam content.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.section2.title', 'Account responsibility')}</h2>
          <p>{t('terms.section2.body', 'You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.section3.title', 'Disclaimer')}</h2>
          <p>{t('terms.section3.body', 'This platform facilitates routing of complaints. We do not guarantee any particular outcome. Institutional responses depend on the respective institution.')}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.section4.title', 'Modification')}</h2>
          <p>{t('terms.section4.body', 'We may update these terms at any time. Continued use after an update constitutes acceptance of the new terms.')}</p>
        </section>
        <p className="text-sm text-gray-400">{t('terms.version', 'Version 1.0 — May 2026')}</p>
      </div>
    </div>
  );
}
