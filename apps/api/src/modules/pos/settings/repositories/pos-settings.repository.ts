import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const POS_SETTING_INCLUDE = {
    defaultParty: true,
    invoiceType: true,
    cashbox: true,
    warehouse: true,
} satisfies Prisma.PosSettingInclude;

export type PosSettingWithRelations = Prisma.PosSettingGetPayload<{ include: typeof POS_SETTING_INCLUDE }>;

@Injectable()
export class PosSettingsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByTenantId(tenantId: string): Promise<PosSettingWithRelations | null> {
        return this.prisma.posSetting.findUnique({ where: { tenantId }, include: POS_SETTING_INCLUDE });
    }

    async upsert(
        tenantId: string,
        data: { defaultPartyId: string; invoiceTypeId: string; cashboxId: string; warehouseId: string },
    ): Promise<PosSettingWithRelations> {
        return this.prisma.posSetting.upsert({
            where: { tenantId },
            create: { tenantId, ...data },
            update: data,
            include: POS_SETTING_INCLUDE,
        });
    }
}
