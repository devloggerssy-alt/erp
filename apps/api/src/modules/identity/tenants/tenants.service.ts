import { Injectable, ConflictException } from '@nestjs/common';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { TenantsRepository } from './repositories/tenants.repository';
import { TenantPresenter } from './presenters/tenant.presenter';

@Injectable()
export class TenantsService {
    constructor(
        private readonly tenantsRepository: TenantsRepository,
        private readonly tenantPresenter: TenantPresenter,
    ) {}

    async create(dto: CreateTenantDto) {
        const existing = await this.tenantsRepository.findBySlug(dto.slug);
        if (existing) {
            throw new ConflictException('Tenant slug already exists');
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const passwordHash = await bcrypt.hash(dto.adminPassword, saltRounds);

        const { tenant, adminUser } = await this.tenantsRepository.createTenantWithAdmin({
            name: dto.name,
            slug: dto.slug,
            address: dto.address,
            phone: dto.phone,
            email: dto.email,
            adminEmail: dto.adminEmail,
            passwordHash,
            adminFullName: dto.adminFullName,
        });

        return {
            ...this.tenantPresenter.toResponse(tenant),
            adminUser: {
                id: adminUser.id,
                email: adminUser.email,
                fullName: adminUser.fullName,
            },
        };
    }

    async findCurrent(tenantId: string): Promise<TenantResponseDto> {
        const tenant = await this.tenantsRepository.findById(tenantId);
        return this.tenantPresenter.toResponse(tenant);
    }

    async updateCurrent(tenantId: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
        const tenant = await this.tenantsRepository.update(tenantId, dto);
        return this.tenantPresenter.toResponse(tenant);
    }
}
