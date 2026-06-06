import type { LocalizedString } from './i18n.dto';

export interface CreateCurrencyDto {
    code: string;
    name: LocalizedString;
    symbol?: LocalizedString;
    isBase?: boolean;
}

export interface UpdateCurrencyDto {
    name?: LocalizedString;
    symbol?: LocalizedString;
    isBase?: boolean;
    isActive?: boolean;
}
