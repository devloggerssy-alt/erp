import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CurrenciesService } from '../../../accounting/currencies/services/currencies.service';
import { CreateCurrencyDto } from '../../../accounting/currencies/dto';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class CurrenciesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly currenciesService: CurrenciesService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateCurrencyDto, payload);
        const existing = await this.currenciesService.list(tenantId, { take: 1000 });
        const existingCodes = new Set(existing.data.map((c) => c.code));

        let created = 0;
        let baseCurrencyId: string | undefined;
        for (const item of items) {
            if (existingCodes.has(item.code)) continue;
            const result = await this.currenciesService.create(tenantId, item);
            created += 1;
            if (item.isBase) baseCurrencyId = result.id;
        }

        if (baseCurrencyId) {
            await this.prisma.tenant.update({ where: { id: tenantId }, data: { baseCurrencyId } });
        }

        return { completed: true, details: { created } };
    }
}
