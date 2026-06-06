import type { LocalizedString } from './i18n.dto';

export interface CreateRoleDto {
    name: LocalizedString;
    description?: LocalizedString;
}

export interface UpdateRoleDto {
    name?: LocalizedString;
    description?: LocalizedString;
}
