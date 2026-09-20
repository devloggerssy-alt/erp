import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class TenantsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findBySlug(slug: string) {
        return this.prisma.tenant.findUnique({ where: { slug } });
    }

    async findById(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }
        return tenant;
    }

    async createTenantWithAdmin(data: {
        name: string;
        slug: string;
        address?: string;
        phone?: string;
        email?: string;
        adminEmail: string;
        passwordHash: string;
        adminFullName: string;
    }) {
        return this.prisma.$transaction(async (tx) => {
            const catalog = await tx.permission.findMany({ select: { id: true } });
            if (catalog.length === 0) {
                throw new InternalServerErrorException(
                    'Permission catalog is empty. Boot the API once to sync permissions before registering tenants.',
                );
            }

            const tenant = await tx.tenant.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    address: data.address,
                    phone: data.phone,
                    email: data.email,
                },
            });

            const ownerRole = await tx.role.create({
                data: {
                    tenantId: tenant.id,
                    name: { ar: 'المالك', en: 'Owner' },
                    description: { ar: 'صلاحية كاملة على النظام', en: 'Full system access' },
                    isSystem: true,
                },
            });

            await tx.rolePermission.createMany({
                data: catalog.map((permission) => ({
                    roleId: ownerRole.id,
                    permissionId: permission.id,
                })),
                skipDuplicates: true,
            });

            const adminUser = await tx.appUser.create({
                data: {
                    tenantId: tenant.id,
                    email: data.adminEmail,
                    passwordHash: data.passwordHash,
                    fullName: data.adminFullName,
                    userRoles: {
                        create: { roleId: ownerRole.id },
                    },
                },
            });

            return { tenant, adminUser };
        });
    }

    async update(
        tenantId: string,
        data: {
            name?: string;
            address?: string;
            phone?: string;
            email?: string;
            logo?: string;
            legalName?: string;
            taxNumber?: string;
            website?: string;
            baseCurrencyId?: string;
            defaultSalesSequenceId?: string;
        },
    ) {
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
}
