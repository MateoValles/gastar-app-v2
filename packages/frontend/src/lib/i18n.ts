import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esTranslations from '@gastar/shared/locales/es.json';
import enTranslations from '@gastar/shared/locales/en.json';

const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): SupportedLanguage {
  // 1. Check localStorage
  const stored = localStorage.getItem('i18n_lng');
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }

  // 2. Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }

  // 3. Default to Spanish
  return 'es';
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: esTranslations },
    en: { translation: enTranslations },
  },
  lng: detectLanguage(),
  fallbackLng: 'es',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
