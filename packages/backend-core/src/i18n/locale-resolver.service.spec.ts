import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { LocaleContext, localeMiddleware, parseLocale } from './locale-context';
import { LocaleResolverService } from './locale-resolver.service';

describe('parseLocale', () => {
    it.each([
        ['en-US,en;q=0.9', 'en'],
        ['EN', 'en'],
        ['ar-SY', 'ar'],
        ['tr', 'ar'],
        [undefined, 'ar'],
    ])('%s → %s', (header, expected) => {
        expect(parseLocale(header)).toBe(expected);
    });
});

describe('LocaleResolverService', () => {
    const resolver = new LocaleResolverService();
    const name = { ar: 'كيلوغرام', en: 'Kilogram' };

    it('is a singleton so it does not make its consumers request-scoped', () => {
        expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, LocaleResolverService)).toBeUndefined();
    });

    it('defaults to Arabic outside any locale context', () => {
        expect(resolver.locale).toBe('ar');
        expect(resolver.resolve(name)).toBe('كيلوغرام');
    });

    it('resolves with the locale of the surrounding context, across awaits', async () => {
        const resolved = await LocaleContext.run('en', async () => {
            await Promise.resolve();
            return resolver.resolve(name);
        });
        expect(resolved).toBe('Kilogram');
    });

    it('falls back to Arabic when the requested translation is missing', () => {
        expect(LocaleContext.run('en', () => resolver.resolve({ ar: 'قطعة' }))).toBe('قطعة');
    });

    it('localeMiddleware runs the rest of the request in the Accept-Language locale', () => {
        let seen: string | undefined;
        localeMiddleware({ headers: { 'accept-language': 'en-GB' } }, {}, () => {
            seen = resolver.locale;
        });
        expect(seen).toBe('en');
    });
});
