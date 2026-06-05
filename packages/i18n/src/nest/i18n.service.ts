import { Injectable } from '@nestjs/common';
import { getMessages, locales } from '../index';
import type { Locale, Messages } from '../index';

@Injectable()
export class I18nService {
  getMessages(locale: Locale): Messages {
    return getMessages(locale);
  }

  translate(key: string, locale: Locale): string {
    const messages = getMessages(locale);
    const value = key
      .split('.')
      .reduce(
        (obj: unknown, k: string) =>
          obj && typeof obj === 'object'
            ? (obj as Record<string, unknown>)[k]
            : undefined,
        messages as unknown,
      );
    return typeof value === 'string' ? value : key;
  }

  resolveLocale(acceptLanguage?: string): Locale {
    if (!acceptLanguage) return 'en';
    const supported = Object.keys(locales) as Locale[];
    for (const lang of acceptLanguage.split(',').map((l) => l.split(';')[0].trim())) {
      if (supported.includes(lang as Locale)) return lang as Locale;
      const prefix = supported.find((l) => l.startsWith(lang.split('-')[0]));
      if (prefix) return prefix;
    }
    return 'en';
  }
}
