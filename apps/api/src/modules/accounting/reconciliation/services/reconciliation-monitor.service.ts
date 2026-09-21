import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@devloggers/db-prisma';
import { AuditWriter, SYSTEM_USER_ID } from '../../../audit';
import { RequestContext } from '../../../../common/request-context/request-context';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { BusinessSetupReconciliationService } from './business-setup-reconciliation.service';
import { diffNewFindings, fingerprintReport, parseFindings } from '../reconciliation-checks';
import { toRunResponse, type ReconciliationRunResponseDto, type ReconciliationTrigger } from '../dto/reconciliation-run.dto';
import { ReconciliationDriftDetectedEvent } from '../events/reconciliation.events';

/**
 * Phase 7.5 — runs the reconciliation gate, stores the run, and alerts only on
 * drift that is new or has grown since the previous run (drift-baselines.md).
 * Called by the daily scheduler, the manual endpoint, and (Phase 6) the
 * RECONCILIATION setup task with trigger 'BUSINESS_SETUP'.
 */
@Injectable()
export class ReconciliationMonitorService {
    private readonly logger = new Logger(ReconciliationMonitorService.name);

    constructor(
        private readonly reconciliation: BusinessSetupReconciliationService,
        private readonly runs: ReconciliationRunsRepository,
        private readonly emitter: EventEmitter2,
        private readonly audit: AuditWriter,
    ) {}

    async runForTenant(tenantId: string, trigger: ReconciliationTrigger): Promise<ReconciliationRunResponseDto> {
        const result = await this.reconciliation.evaluate(tenantId);
        const findings = fingerprintReport(result.report);
        const previous = await this.runs.findLatest(tenantId);
        const newFindings = diffNewFindings(previous ? parseFindings(previous.findings) : null, findings);
        const correlationId = RequestContext.correlationId() ?? null;

        const run = await this.runs.create({
            tenantId,
            trigger,
            passed: result.passed,
            findingCount: Object.keys(findings).length,
            findings,
            newFindings,
            report: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
            correlationId,
        });

        if (newFindings.length > 0) {
            this.logger.warn({ msg: 'reconciliation drift increased', tenantId, runId: run.id, trigger, newFindings });
            this.emitter.emit(
                ReconciliationDriftDetectedEvent.NAME,
                new ReconciliationDriftDetectedEvent(tenantId, run.id, newFindings),
            );
            await this.audit.record({
                tenantId,
                userId: RequestContext.get()?.userId ?? SYSTEM_USER_ID,
                action: 'RECONCILIATION_DRIFT_DETECTED',
                entityType: 'reconciliation_run',
                entityId: run.id,
                newValues: { newFindings, trigger },
            });
        }

        return toRunResponse(run);
    }
}
