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

export interface UpdateProfileDto {
    fullName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
}

export interface ProfileResponseDto {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
}
