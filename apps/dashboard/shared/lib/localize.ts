import type { LocalizedString } from '@devloggers/api-contracts';

export function localize(
    value: LocalizedString | string | null | undefined,
    locale: string,
    fallback = '',
): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    const lang = locale === 'en' ? 'en' : 'ar';
    return (value[lang as keyof LocalizedString] ?? value.ar) || fallback;
}
