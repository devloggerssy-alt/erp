import type { LocalizedString } from './i18n.dto';

export interface CreateWarehouseDto {
    code?: string;
    name: LocalizedString;
    address?: string;
}

export interface UpdateWarehouseDto {
    name?: LocalizedString;
    address?: string | null;
    isActive?: boolean;
}
