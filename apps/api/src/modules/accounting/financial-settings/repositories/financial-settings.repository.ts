import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { FinancialSetting } from '@devloggers/db-prisma';

@Injectable()
export class FinancialSettingsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findByTenantId(tenantId: string): Promise<FinancialSetting | null> {
        return this.prisma.financialSetting.findUnique({ where: { tenantId },
             include: {
                defaultPayableAccount: true,
                defaultReceivableAccount: true,
                defaultSalesAccount: true,
                defaultPurchaseAccount: true,
                defaultTaxAccount: true,
                defaultInventoryAccount: true,
                defaultCogsAccount: true,
                defaultInventoryAdjustmentAccount: true,
                defaultOpeningEquityAccount: true,

              } });
    }

    async upsert(tenantId: string, data: Partial<Omit<FinancialSetting, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<FinancialSetting> {
        return this.prisma.financialSetting.upsert({
            where: { tenantId },
            create: { tenantId, ...data },
            update: data,
        });
    }
}
