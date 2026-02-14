import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from './lib/locale';

// Supported locales
export const locales = ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'da', 'no', 'sv', 'pl', 'el', 'tr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  da: 'Dansk',
  no: 'Norsk',
  sv: 'Svenska',
  pl: 'Polski',
  el: 'Ελληνικά',
  tr: 'Türkçe',
};

export default getRequestConfig(async () => {
  // Get locale from cookie or default to 'en'
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

