import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { LocalizedString } from '@devloggers/api-contracts';

export type SupportedLocale = 'ar' | 'en';

interface IncomingRequest {
    headers: Record<string, string | string[] | undefined>;
}

@Injectable({ scope: Scope.REQUEST })
export class LocaleResolverService {
    constructor(@Inject(REQUEST) private readonly req: IncomingRequest) {}

    get locale(): SupportedLocale {
        const header = (this.req.headers['accept-language'] as string) ?? '';
        const lang = header.split(',')[0]?.split('-')[0]?.toLowerCase();
        return lang === 'en' ? 'en' : 'ar';
    }

    resolve(field: LocalizedString | null | undefined, fallback = ''): string {
        if (!field) return fallback;
        return field[this.locale] ?? field.ar ?? fallback;
    }
}
