import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { getMessages, locales as localeMessages } from '../index.js';
import { routing } from './routing.mjs';

export const createSharedRequestConfig = () =>
  getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale;

    return {
      locale,
      messages: getMessages(locale as keyof typeof localeMessages),
      onError: (error: Error) => {
        if (error.message.includes('MISSING_MESSAGE')) {
          return undefined;
        }

        throw error;
      },
    };
  });
