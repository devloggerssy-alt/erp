import { Injectable } from '@nestjs/common';
import type { LocalizedString } from '@devloggers/api-contracts';
import { LocaleContext, type SupportedLocale } from './locale-context';

/** Singleton: reads the locale from `LocaleContext`, populated per request by `localeMiddleware`. */
@Injectable()
export class LocaleResolverService {
    get locale(): SupportedLocale {
        return LocaleContext.current();
    }

    resolve(field: LocalizedString | null | undefined, fallback = ''): string {
        if (!field) return fallback;
        return field[this.locale] ?? field.ar ?? fallback;
    }
}
