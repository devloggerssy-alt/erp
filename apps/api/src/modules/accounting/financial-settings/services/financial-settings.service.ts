import { Injectable, BadRequestException } from '@nestjs/common';
import type { FinancialSetting } from '@devloggers/db-prisma';
import { FinancialSettingsRepository } from '../repositories/financial-settings.repository';
import type { UpsertFinancialSettingDto } from '@devloggers/api-contracts';

@Injectable()
export class FinancialSettingsService {
    constructor(private readonly repo: FinancialSettingsRepository) {}

    async findByTenantId(tenantId: string): Promise<FinancialSetting | null> {
        return this.repo.findByTenantId(tenantId);
    }

    /**
     * Returns the tenant's FinancialSetting or throws BadRequestException.
     * Use this in posting services where settings are mandatory.
     */
    async getOrThrow(tenantId: string): Promise<FinancialSetting> {
        const settings = await this.repo.findByTenantId(tenantId);
        if (!settings) {
            throw new BadRequestException(
                'Financial settings are not configured for this tenant. ' +
                'Please set up the default GL accounts before posting transactions.',
            );
        }
        return settings;
    }

    async upsert(tenantId: string, dto: UpsertFinancialSettingDto): Promise<FinancialSetting> {
        return this.repo.upsert(tenantId, dto);
    }
}
