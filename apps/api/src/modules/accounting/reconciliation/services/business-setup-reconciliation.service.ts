import { Injectable } from '@nestjs/common';
import { BalanceDriftService } from './balance-drift.service';
import type { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { buildChecks } from '../reconciliation-checks';

/**
 * Phase 7.4.1 — the reconciliation gate. Wraps BalanceDriftService (the queries)
 * and presents the 8-check stack. Phase 6's RECONCILIATION setup task and
 * Phase 10's readiness gate consume `evaluate().passed`.
 */
@Injectable()
export class BusinessSetupReconciliationService {
    constructor(private readonly drift: BalanceDriftService) {}

    async evaluate(tenantId: string): Promise<ReconciliationResultDto> {
        const report = await this.drift.getReport(tenantId);
        const checks = buildChecks(report);
        return {
            generatedAt: report.generatedAt,
            passed: checks.every((c) => c.passed),
            checks,
            report,
        };
    }
}
