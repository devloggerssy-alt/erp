import { Injectable } from '@nestjs/common';
import { ChartOfAccountsBootstrapService } from '../../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class ChartOfAccountsTaskHandler implements SetupTaskHandler {
    constructor(private readonly bootstrapService: ChartOfAccountsBootstrapService) {}

    async execute(tenantId: string, _userId: string, _payload: unknown): Promise<SetupTaskHandlerResult> {
        const codeToId = await this.bootstrapService.bootstrapDefaultTemplate(tenantId);
        return { completed: true, details: { accountCount: Object.keys(codeToId).length } };
    }
}
