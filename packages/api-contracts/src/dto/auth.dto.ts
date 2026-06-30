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

export interface AuthTenant {
    id: string;
    name: string;
    slug: string;
    onboardingStep: number;
    onboardingCompletedAt: string | null;
}

export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    roles: string[];
    tenant: AuthTenant;
}

export interface TokenPayload {
    sub: string;
    tenantId: string;
    email: string;
}
