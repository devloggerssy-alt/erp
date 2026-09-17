import { Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import { UpsertFinancialSettingBodyDto } from '../../../accounting/financial-settings/dto';
import { validateAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class FinancialMappingsTaskHandler implements SetupTaskHandler {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const dto = await validateAs(UpsertFinancialSettingBodyDto, payload);
        await this.financialSettingsService.upsert(tenantId, dto);
        return { completed: true, details: {} };
    }
}
