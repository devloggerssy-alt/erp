import arShared from './ar/shared.json';
import arSystem from './ar/system.json';

import enShared from './en/shared.json';
import enSystem from './en/system.json';

export const ar = {
  shared: arShared,
  system: arSystem,
} as const;

export const en = {
  shared: enShared,
  system: enSystem,
} as const;

export const locales = {
  'ar': ar,
  'en': en,
} as const;

export type Locale = keyof typeof locales;
export type Messages = (typeof locales)[Locale];

export function getMessages(locale: Locale): Messages {
  return locales[locale];
}
