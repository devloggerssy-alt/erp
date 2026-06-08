import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
    settingsRegistry,
    mergeWithDefaults,
    groupByCategory,
    validateSettingsPatch,
    type GroupedSettings,
    type SettingKey,
} from '@devloggers/api-contracts';
import { TenantSettingsRepository } from '../repositories/tenant-settings.repository';

@Injectable()
export class SettingsService {
    constructor(private readonly repository: TenantSettingsRepository) {}

    async getAll(tenantId: string): Promise<GroupedSettings> {
        const rows = await this.repository.findAll(tenantId);
        return groupByCategory(mergeWithDefaults(rows));
    }

    async update(tenantId: string, patch: Record<string, unknown>): Promise<GroupedSettings> {
        const { values, errors } = validateSettingsPatch(patch);
        if (Object.keys(errors).length > 0) {
            throw new UnprocessableEntityException({ message: 'Invalid settings', errors });
        }
        const entries = Object.entries(values).map(([key, value]) => ({
            key,
            value,
            category: settingsRegistry[key as SettingKey].category,
        }));
        await this.repository.upsertMany(tenantId, entries);
        return this.getAll(tenantId);
    }
}
