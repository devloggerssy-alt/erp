import type { ApiComponents } from '../api';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

export type AuthTenant = ApiComponents['schemas']['AuthTenantDto']

export type AuthUser = ApiComponents['schemas']['AuthUserDto']

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

export interface TokenPayload {
    sub: string;
    tenantId: string;
    email: string;
}
