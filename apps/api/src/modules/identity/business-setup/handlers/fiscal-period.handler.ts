import { ConflictException, Injectable } from '@nestjs/common';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { CreateFiscalPeriodDto } from '../../../accounting/fiscal-periods/dto';
import { validateAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class FiscalPeriodTaskHandler implements SetupTaskHandler {
    constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const dto = await validateAs(CreateFiscalPeriodDto, payload);
        try {
            const created = await this.fiscalPeriodsService.create(tenantId, dto);
            return { completed: true, details: { fiscalPeriodId: created.id } };
        } catch (error) {
            if (error instanceof ConflictException) {
                return { completed: true, details: { fiscalPeriodId: null } };
            }
            throw error;
        }
    }
}
