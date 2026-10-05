import { AsyncLocalStorage } from 'node:async_hooks';

export type SupportedLocale = 'ar' | 'en';

const DEFAULT_LOCALE: SupportedLocale = 'ar';

const storage = new AsyncLocalStorage<SupportedLocale>();

/** `Accept-Language` / BCP-47 value → supported locale; anything that is not English falls back to Arabic. */
export function parseLocale(value: string | null | undefined): SupportedLocale {
    const lang = (value ?? '').split(',')[0]?.split('-')[0]?.trim().toLowerCase();
    return lang === 'en' ? 'en' : DEFAULT_LOCALE;
}

/**
 * Carries the caller's locale through async work without request-scoped DI.
 * A request-scoped resolver would make every presenter/service that injects it
 * request-scoped too, which breaks singletons built at bootstrap (e.g. AI tools).
 */
export const LocaleContext = {
    run<T>(locale: SupportedLocale, fn: () => T): T {
        return storage.run(locale, fn);
    },

    current(): SupportedLocale {
        return storage.getStore() ?? DEFAULT_LOCALE;
    },
};

interface LocaleRequest {
    headers: Record<string, string | string[] | undefined>;
}

/** Plain Express middleware (register with `app.use`): everything downstream of `next()` sees the request locale. */
export function localeMiddleware(req: LocaleRequest, _res: unknown, next: () => void): void {
    const header = req.headers['accept-language'];
    LocaleContext.run(parseLocale(Array.isArray(header) ? header[0] : header), next);
}
