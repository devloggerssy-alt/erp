import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTenantDto) {
        // Check slug uniqueness
        const existing = await this.prisma.tenant.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new ConflictException('Tenant slug already exists');
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const passwordHash = await bcrypt.hash(dto.adminPassword, saltRounds);

        // Create tenant + admin user + default admin role in a transaction
        return this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    address: dto.address,
                    phone: dto.phone,
                    email: dto.email,
                },
            });

            const adminRole = await tx.role.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Admin',
                    description: 'Full system access',
                    isSystem: true,
                },
            });

            const adminUser = await tx.appUser.create({
                data: {
                    tenantId: tenant.id,
                    email: dto.adminEmail,
                    passwordHash,
                    fullName: dto.adminFullName,
                    userRoles: {
                        create: { roleId: adminRole.id },
                    },
                },
            });

            return {
                ...tenant,
                adminUser: {
                    id: adminUser.id,
                    email: adminUser.email,
                    fullName: adminUser.fullName,
                },
            };
        });
    }

    async findCurrent(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }
        return tenant;
    }

    async updateCurrent(tenantId: string, dto: UpdateTenantDto) {
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: dto,
        });
    }
}
