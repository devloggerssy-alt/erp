import type { ApiComponents } from '../api';

export type AuthTenant = ApiComponents['schemas']['AuthTenantDto']

export type AuthUser = ApiComponents['schemas']['AuthUserDto']

export interface TokenPayload {
    sub: string;
    tenantId: string;
    email: string;
}
