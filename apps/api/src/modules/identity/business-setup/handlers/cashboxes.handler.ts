import { Injectable } from '@nestjs/common';
import { CashboxesService, CreateCashboxDto } from '../../../invoicing';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class CashboxesTaskHandler implements SetupTaskHandler {
    constructor(private readonly cashboxesService: CashboxesService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateCashboxDto, payload);
        const existing = await this.cashboxesService.list(tenantId, { take: 1000 });
        const existingCodes = new Set(existing.data.map((c) => c.code));

        let created = 0;
        for (const item of items) {
            if (item.code && existingCodes.has(item.code)) continue;
            await this.cashboxesService.create(tenantId, item);
            created += 1;
        }

        return { completed: true, details: { created } };
    }
}
