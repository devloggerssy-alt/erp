export interface CreateTenantDto {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    // Initial admin user
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
}

export interface UpdateTenantDto {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
}
