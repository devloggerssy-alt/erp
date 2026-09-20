import { Injectable } from '@nestjs/common';
import { BusinessSetupReconciliationService } from '../../../accounting/reconciliation/services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from '../../../accounting/reconciliation/services/reconciliation-monitor.service';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

/**
 * Runs the Phase 7 reconciliation stack and stores both the run reference and a
 * per-check summary in the task's `progress` JSON. The summary is what the setup
 * hub renders as explicit blockers when the run fails (Phase 10.4.3). The
 * monitor is the source of truth for pass/fail (history + drift diffing); the
 * extra `evaluate()` call only fetches the per-check breakdown, which the run
 * response does not include. Both calls are read-only and back-to-back.
 */
@Injectable()
export class ReconciliationTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly reconciliationMonitor: ReconciliationMonitorService,
        private readonly reconciliation: BusinessSetupReconciliationService,
    ) {}

    async execute(tenantId: string, _userId: string, _payload: unknown): Promise<SetupTaskHandlerResult> {
        const evaluation = await this.reconciliation.evaluate(tenantId);
        const run = await this.reconciliationMonitor.runForTenant(tenantId, 'BUSINESS_SETUP');
        return {
            completed: run.passed,
            details: {
                runId: run.id,
                findingCount: run.findingCount,
                newFindings: run.newFindings,
                checks: evaluation.checks.map((check) => ({
                    code: check.code,
                    passed: check.passed,
                    findingCount: check.findingCount,
                })),
            },
        };
    }
}
