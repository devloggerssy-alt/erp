import { defineRouting } from 'next-intl/routing';

export const locales = [
  {
    key: 'ar',
    title: 'العربية',
    isRtl: true,
    countryCode: 'sy',
  },
  {
    key: 'en',
    title: 'English',
    isRtl: false,
    countryCode: 'us',
  },
  {
    key: 'tr',
    title: 'Türkçe',
    isRtl: false,
    countryCode: 'tr',
  },
] as const;

export const routing = defineRouting({
  locales: locales.map((locale) => locale.key),
  localePrefix: 'always',
  defaultLocale: 'ar',
});

export type AppLocale = (typeof routing.locales)[number];
