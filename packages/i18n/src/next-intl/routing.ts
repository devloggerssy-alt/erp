import { defineRouting } from 'next-intl/routing';

export const locales = [
  {
    key: 'ar-SY',
    title: 'العربية',
    isRtl: true,
    countryCode: 'sy',
  },
] as const;

export const routing = defineRouting({
  locales: locales.map((locale) => locale.key),
  localePrefix: 'as-needed',
  defaultLocale: 'ar-SY',
});
