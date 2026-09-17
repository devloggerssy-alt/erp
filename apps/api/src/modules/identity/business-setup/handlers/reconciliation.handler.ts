import { Injectable } from '@nestjs/common';
import { ReconciliationMonitorService } from '../../../accounting/reconciliation/services/reconciliation-monitor.service';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class ReconciliationTaskHandler implements SetupTaskHandler {
    constructor(private readonly reconciliationMonitor: ReconciliationMonitorService) {}

    async execute(tenantId: string, _userId: string, _payload: unknown): Promise<SetupTaskHandlerResult> {
        const run = await this.reconciliationMonitor.runForTenant(tenantId, 'BUSINESS_SETUP');
        return {
            completed: run.passed,
            details: { runId: run.id, findingCount: run.findingCount, newFindings: run.newFindings },
        };
    }
}
