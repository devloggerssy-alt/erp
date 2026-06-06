import createMiddleware from 'next-intl/middleware';
import { createSharedNavigation } from './navigation.mjs';
import { routing, locales } from './routing.mjs';

export { routing, locales };

export { createSharedNavigation };

export const createSharedMiddleware: () => any = () =>
  createMiddleware(routing);

export const intlMiddlewareConfig = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
} as const;

export {
  hasLocale,
  useLocale,
  useTranslations,
  useNow,
  useTimeZone,
  useFormatter,
  NextIntlClientProvider,
} from 'next-intl';
export { getRequestConfig, getMessages, getTranslations } from 'next-intl/server';
export { default as createNextIntlMiddleware } from 'next-intl/middleware';
export { createNavigation as createNextIntlNavigation } from 'next-intl/navigation';
export { defineRouting as defineNextIntlRouting } from 'next-intl/routing';
