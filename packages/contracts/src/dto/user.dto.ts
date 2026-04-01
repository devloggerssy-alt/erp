export interface CreateUserDto {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    roleIds?: string[];
}

export interface UpdateUserDto {
    email?: string;
    fullName?: string;
    phone?: string;
    roleIds?: string[];
}

export interface UpdateUserStatusDto {
    isActive: boolean;
}
