import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN'
import en from './locales/en'

const resources = {
  'zh-CN': { translation: zhCN },
  en: { translation: en },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-CN', // default language
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false, // React already escapes
  },
})

export default i18n
