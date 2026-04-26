export interface CreateRoleDto {
    name: string;
    description?: string;
}

export interface UpdateRoleDto {
    name?: string;
    description?: string;
}
