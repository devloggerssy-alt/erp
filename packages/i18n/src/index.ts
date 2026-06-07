import arShared from './ar/shared.json';
import arSystem from './ar/system.json';
import arBusiness from './ar/business.json';

import enSystem from './en/system.json';
import enBusiness from './en/business.json';

import trSystem from './tr/system.json';
import trBusiness from './tr/business.json';

export const ar = {
  shared: arShared,
  system: arSystem,
  business: arBusiness,
} as const;

export const en = {
  system: enSystem,
  business: enBusiness,
} as const;

export const tr = {
  system: trSystem,
  business: trBusiness,
} as const;

export const locales = {
  'ar': ar,
  'en': en,
  'tr': tr,
} as const;

export type Locale = keyof typeof locales;
export type Messages = (typeof locales)[Locale];

export function getMessages(locale: Locale): Messages {
  return locales[locale];
}
