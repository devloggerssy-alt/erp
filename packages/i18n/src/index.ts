import arShared from './ar-SY/shared.json' with { type: 'json' };
import arSystem from './ar-SY/system.json' with { type: 'json' };

import enShared from './en/shared.json' with { type: 'json' };
import enSystem from './en/system.json' with { type: 'json' };

export const ar = {
  shared: arShared,
  system: arSystem,
} as const;

export const en = {
  shared: enShared,
  system: enSystem,
} as const;

export const locales = {
  'ar-SY': ar,
  en,
} as const;

export type Locale = keyof typeof locales;
export type Messages = (typeof locales)[Locale];

export function getMessages(locale: Locale): Messages {
  return locales[locale];
}
