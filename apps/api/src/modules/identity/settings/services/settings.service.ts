import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
    ApiErrorCode,
    settingsRegistry,
    mergeWithDefaults,
    groupByCategory,
    getSettingRef,
    validateSettingsPatch,
    type FieldError,
    type GroupedSettings,
    type SettingKey,
    type SettingReference,
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

        const [fiscalPeriodRow, tenant, settingRows, financialSetting] = await Promise.all([
            this.prisma.fiscalPeriod.findFirst({
                where: { tenantId, status: 'OPEN', startDate: { lte: now }, endDate: { gte: now } },
                select: { id: true, name: true },
                orderBy: { startDate: 'desc' },
            }),
            this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { baseCurrencyId: true },
            }),
            this.repository.findAll(tenantId),
            this.prisma.financialSetting.findUnique({
                where: { tenantId },
                select: { defaultReceivableAccountId: true, defaultPayableAccountId: true },
            }),
        ]);

        const flat = mergeWithDefaults(settingRows);
        const defaultWarehouseId = flat.defaultWarehouseId as string | null;
        const defaultUnitId = flat.defaultUnitId as string | null;

        const fiscalPeriod = fiscalPeriodRow
            ? { id: fiscalPeriodRow.id, name: fiscalPeriodRow.name }
            : null;

        const [currencyRow, cashboxRow] = await Promise.all([
            tenant?.baseCurrencyId
                ? this.prisma.currency.findUnique({
                      where: { id: tenant.baseCurrencyId },
                      select: { id: true, code: true, name: true },
                  })
                : Promise.resolve(null),
            tenant?.baseCurrencyId
                ? this.prisma.cashbox.findFirst({
                      where: { tenantId, currencyId: tenant.baseCurrencyId, isActive: true },
                      select: { id: true, code: true, name: true },
                      orderBy: { createdAt: 'asc' },
                  })
                : Promise.resolve(null),
        ]);

        // Explicit default wins; if unset (or since deleted/deactivated), fall
        // back to the first active row so forms always arrive pre-filled.
        const warehouseRow =
            (defaultWarehouseId
                ? await this.prisma.warehouse.findFirst({
                      where: { id: defaultWarehouseId, tenantId, isActive: true },
                      select: { id: true, code: true, name: true },
                  })
                : null) ??
            (await this.prisma.warehouse.findFirst({
                where: { tenantId, isActive: true },
                select: { id: true, code: true, name: true },
                orderBy: { createdAt: 'asc' },
            }));

        const unitRow =
            (defaultUnitId
                ? await this.prisma.unit.findFirst({
                      where: { id: defaultUnitId, tenantId, isActive: true },
                      select: { id: true, name: true, abbreviation: true },
                  })
                : null) ??
            (await this.prisma.unit.findFirst({
                where: { tenantId, isActive: true },
                select: { id: true, name: true, abbreviation: true },
                orderBy: { createdAt: 'asc' },
            }));

        // No fallback to "first active account" here, unlike warehouse/unit: an
        // arbitrary account could be the wrong type (not AR/AP) or non-postable,
        // so this stays null until the tenant explicitly configures it.
        const accountIds = [financialSetting?.defaultReceivableAccountId, financialSetting?.defaultPayableAccountId]
            .filter((id): id is string => !!id);
        const accountRows = accountIds.length
            ? await this.prisma.chartOfAccount.findMany({
                  where: { id: { in: accountIds }, tenantId },
                  select: { id: true, code: true, name: true },
              })
            : [];
        const accountById = new Map(accountRows.map((row) => [row.id, row]));

        const currency = currencyRow
            ? { id: currencyRow.id, code: currencyRow.code, name: this.locale.resolve(currencyRow.name as never) }
            : null;

        const cashbox = cashboxRow
            ? { id: cashboxRow.id, code: cashboxRow.code, name: this.locale.resolve(cashboxRow.name as never) }
            : null;

        const warehouse = warehouseRow
            ? { id: warehouseRow.id, code: warehouseRow.code, name: this.locale.resolve(warehouseRow.name as never) }
            : null;

        const unit = unitRow
            ? { id: unitRow.id, name: this.locale.resolve(unitRow.name as never), abbreviation: unitRow.abbreviation }
            : null;

        const toAccountDefault = (id: string | null | undefined) => {
            const row = id ? accountById.get(id) : undefined;
            return row ? { id: row.id, code: row.code, name: this.locale.resolve(row.name as never) } : null;
        };
        const receivableAccount = toAccountDefault(financialSetting?.defaultReceivableAccountId);
        const payableAccount = toAccountDefault(financialSetting?.defaultPayableAccountId);

        return { fiscalPeriod, currency, cashbox, warehouse, unit, receivableAccount, payableAccount };
    }

    async update(tenantId: string, patch: Record<string, unknown>): Promise<GroupedSettings> {
        const { values, errors } = validateSettingsPatch(patch);
        Object.assign(errors, await this.validateReferences(tenantId, values));
        if (Object.keys(errors).length > 0) {
            const details: FieldError[] = Object.entries(errors).flatMap(([field, messages]) =>
                messages.map((message) => ({ field, message, code: 'settings' })),
            );
            throw new UnprocessableEntityException({
                code: ApiErrorCode.VALIDATION_ERROR,
                message: 'Invalid settings',
                details,
            });
        }
        const entries = Object.entries(values).map(([key, value]) => ({
            key,
            value,
            category: settingsRegistry[key as SettingKey].category,
        }));
        await this.repository.upsertMany(tenantId, entries);
        return this.getAll(tenantId);
    }

    /** Verifies that id-valued settings point at a row owned by the tenant. */
    private async validateReferences(
        tenantId: string,
        values: Record<string, unknown>,
    ): Promise<Record<string, string[]>> {
        const errors: Record<string, string[]> = {};
        await Promise.all(
            Object.entries(values).map(async ([key, value]) => {
                const ref = getSettingRef(key);
                if (!ref || typeof value !== 'string') return;
                const exists = await this.referenceExists(tenantId, ref, value);
                if (!exists) errors[key] = [`Referenced ${ref} not found`];
            }),
        );
        return errors;
    }

    private async referenceExists(
        tenantId: string,
        ref: SettingReference,
        id: string,
    ): Promise<boolean> {
        switch (ref) {
            case 'warehouse':
                return (
                    (await this.prisma.warehouse.findFirst({
                        where: { id, tenantId },
                        select: { id: true },
                    })) !== null
                );
            case 'unit':
                return (
                    (await this.prisma.unit.findFirst({
                        where: { id, tenantId },
                        select: { id: true },
                    })) !== null
                );
        }
    }
}
