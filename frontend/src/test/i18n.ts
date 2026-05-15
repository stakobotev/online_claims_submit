import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      common: {
        app: { name: 'Vallentin Claims' },
        auth: {
          email: 'Email',
          name: 'Full name',
          password: 'Password',
          passwordConfirmation: 'Confirm password',
          passwordHint: 'Min 8 chars with uppercase, lowercase, digit and special character',
          registerAction: 'Create account',
          agreeTerms: 'I accept the',
          and: 'and',
          marketing: 'Send me product updates and news (optional)',
          forgotPassword: 'Forgot your password?',
          orContinueWith: 'or continue with',
          alreadyHaveAccount: 'Already have an account?',
          noAccount: "Don't have an account?",
          invalidCredentials: 'Invalid email or password.',
          captchaRequired: 'Please complete the CAPTCHA.',
        },
        nav: {
          login: 'Log In',
          register: 'Register',
          terms: 'Terms of Use',
          privacy: 'Privacy Policy',
        },
        errors: {
          generic: 'Something went wrong. Please try again.',
        },
        complaint: {
          category: 'Category',
          selectCategory: 'Select a category',
          institution: 'Institution',
          selectInstitution: 'Select institution',
          title: 'Title',
          body: 'Description',
          bodyHint: 'Minimum {{min}} characters',
          minChars: 'chars minimum',
          urgent: 'This is urgent',
          contactOptional: 'Contact details (optional)',
          contactName: 'Your name',
          contactEmail: 'Email for confirmation copy',
          attachments: 'Attachments',
          switchToFreeText: 'Type institution name',
          switchToDropdown: 'Select from list',
          institutionFreeTextPlaceholder: 'Enter institution name',
        },
        actions: {
          submit: 'Submit',
        },
        dropzone: {
          label: 'Upload attachments',
          hint: 'Drag and drop or click to upload. Max {{max}} files, {{size}} total.',
          tally: '{{count}}/{{max}} files · {{size}} / {{maxSize}}',
          remove: 'Remove {{name}}',
        },
      },
    },
  },
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
});

export default i18n;
