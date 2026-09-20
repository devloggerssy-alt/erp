import type { LocalizedString } from './i18n.dto';
import type { PermissionKey } from '../permissions/permission-catalog';

export interface CreateRoleDto {
    name: LocalizedString;
    description?: LocalizedString;
    permissionKeys?: PermissionKey[];
}

export interface UpdateRoleDto {
    name?: LocalizedString;
    description?: LocalizedString;
    permissionKeys?: PermissionKey[];
}
