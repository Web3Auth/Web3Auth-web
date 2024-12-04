import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';

import enJSON from './translations/en.json'
import viJSON from './translations/vi.json'
console.log(enJSON)
i18n
.use(LanguageDetector)  
.use(initReactI18next)
.init({
  debug: true,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
  },
  resources: {
    en: {
      translation: { ...enJSON }
    },
    vi: {
      translation: { ...viJSON }
    },
  },
  lng: "en",
});