import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

export interface SettingUpsert {
    key: string;
    value: unknown;
    category: string;
}

@Injectable()
export class TenantSettingsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string): Promise<Array<{ key: string; value: unknown }>> {
        const rows = await this.prisma.tenantSetting.findMany({
            where: { tenantId },
            select: { key: true, value: true },
        });
        return rows.map((r) => ({ key: r.key, value: r.value as unknown }));
    }

    async upsertMany(tenantId: string, entries: SettingUpsert[]): Promise<void> {
        if (entries.length === 0) return;
        await this.prisma.$transaction(
            entries.map((entry) =>
                this.prisma.tenantSetting.upsert({
                    where: { tenantId_key: { tenantId, key: entry.key } },
                    create: {
                        tenantId,
                        key: entry.key,
                        category: entry.category,
                        value: entry.value as object,
                    },
                    update: { value: entry.value as object, category: entry.category },
                }),
            ),
        );
    }
}
