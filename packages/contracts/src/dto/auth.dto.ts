
export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    roles: string[];
}

export interface TokenPayload {
    sub: string;
    tenantId: string;
    email: string;
}
