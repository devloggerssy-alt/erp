import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { FinancialSetting } from '@devloggers/db-prisma';
import { FinancialSettingsRepository } from '../repositories/financial-settings.repository';
import { assertAccountFitsSlot, SLOT_EXPECTATIONS, type AccountSlotName } from '../../accounts/utils/assert-account-fits-slot';
import type { UpsertFinancialSettingDto } from '@devloggers/api-contracts';

const SLOT_ID_FIELDS: Record<AccountSlotName, keyof UpsertFinancialSettingDto> = {
    defaultSales: 'defaultSalesAccountId',
    defaultPurchase: 'defaultPurchaseAccountId',
    defaultTax: 'defaultTaxAccountId',
    defaultReceivable: 'defaultReceivableAccountId',
    defaultPayable: 'defaultPayableAccountId',
    defaultInventory: 'defaultInventoryAccountId',
    defaultCogs: 'defaultCogsAccountId',
    defaultInventoryAdjustment: 'defaultInventoryAdjustmentAccountId',
    defaultOpeningEquity: 'defaultOpeningEquityAccountId',
};

@Injectable()
export class FinancialSettingsService {
    constructor(
        private readonly repo: FinancialSettingsRepository,
        private readonly prisma: PrismaService,
    ) {}

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
        await this.validateSlots(tenantId, dto);
        return this.repo.upsert(tenantId, dto);
    }

    /** Validates every provided GL slot account is postable, active, non-deleted, and the expected type. */
    private async validateSlots(tenantId: string, dto: UpsertFinancialSettingDto): Promise<void> {
        const slotIdsBySlot = {} as Record<AccountSlotName, string | undefined>;
        (Object.keys(SLOT_ID_FIELDS) as AccountSlotName[]).forEach((slot) => {
            slotIdsBySlot[slot] = dto[SLOT_ID_FIELDS[slot]] as string | undefined;
        });

        const ids = Object.values(slotIdsBySlot).filter(
            (v): v is string => !!v,
        );
        if (ids.length === 0) return;

        const accounts = await this.prisma.chartOfAccount.findMany({
            where: { id: { in: ids }, tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true, isActive: true },
        });
        const byId = new Map(accounts.map((a) => [a.id, a]));

        (Object.keys(slotIdsBySlot) as AccountSlotName[]).forEach((slot) => {
            const id = slotIdsBySlot[slot];
            if (id) {
                assertAccountFitsSlot(byId.get(id) ?? null, SLOT_EXPECTATIONS[slot], slot);
            }
        });
    }
}