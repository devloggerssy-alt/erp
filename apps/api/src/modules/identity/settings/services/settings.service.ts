import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
    settingsRegistry,
    mergeWithDefaults,
    groupByCategory,
    validateSettingsPatch,
    type GroupedSettings,
    type SettingKey,
} from '@devloggers/api-contracts';
import { LocaleResolverService } from '@devloggers/backend-core';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { TenantSettingsRepository } from '../repositories/tenant-settings.repository';
import type { FormDefaultsResponseDto } from '../dto/settings.dto';

@Injectable()
export class SettingsService {
    constructor(
        private readonly repository: TenantSettingsRepository,
        private readonly prisma: PrismaService,
        private readonly locale: LocaleResolverService,
    ) {}

    async getAll(tenantId: string): Promise<GroupedSettings> {
        const rows = await this.repository.findAll(tenantId);
        return groupByCategory(mergeWithDefaults(rows));
    }

    async getDefaults(tenantId: string): Promise<FormDefaultsResponseDto> {
        const now = new Date();

        const [fiscalPeriodRow, tenant] = await Promise.all([
            this.prisma.fiscalPeriod.findFirst({
                where: { tenantId, status: 'OPEN', startDate: { lte: now }, endDate: { gte: now } },
                select: { id: true, name: true },
                orderBy: { startDate: 'desc' },
            }),
            this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { baseCurrencyId: true },
            }),
        ]);

        const fiscalPeriod = fiscalPeriodRow
            ? { id: fiscalPeriodRow.id, name: fiscalPeriodRow.name }
            : null;

        if (!tenant?.baseCurrencyId) {
            return { fiscalPeriod, currency: null, cashbox: null };
        }

        const [currencyRow, cashboxRow] = await Promise.all([
            this.prisma.currency.findUnique({
                where: { id: tenant.baseCurrencyId },
                select: { id: true, code: true, name: true },
            }),
            this.prisma.cashbox.findFirst({
                where: { tenantId, currencyId: tenant.baseCurrencyId, isActive: true },
                select: { id: true, code: true, name: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const currency = currencyRow
            ? { id: currencyRow.id, code: currencyRow.code, name: this.locale.resolve(currencyRow.name as never) }
            : null;

        const cashbox = cashboxRow
            ? { id: cashboxRow.id, code: cashboxRow.code, name: this.locale.resolve(cashboxRow.name as never) }
            : null;

        return { fiscalPeriod, currency, cashbox };
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
