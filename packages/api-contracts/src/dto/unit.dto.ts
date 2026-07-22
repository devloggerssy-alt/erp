import type { LocalizedString } from './i18n.dto';

export interface CreateUnitDto {
    name: LocalizedString;
    abbreviation: string;
}

export interface UpdateUnitDto {
    name?: LocalizedString;
    abbreviation?: string;
    isActive?: boolean;
}