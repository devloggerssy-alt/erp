import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RequestContext } from '../../../../common/request-context/request-context';
import { SYSTEM_USER_ID } from '../../../audit';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { ReconciliationMonitorService } from './reconciliation-monitor.service';

/** Phase 7.5.1 — daily reconciliation per tenant; alerts come from the monitor. */
@Injectable()
export class ReconciliationScheduler {
    private readonly logger = new Logger(ReconciliationScheduler.name);

    constructor(
        private readonly runs: ReconciliationRunsRepository,
        private readonly monitor: ReconciliationMonitorService,
        private readonly config: ConfigService,
    ) {}

    @Cron('0 3 * * *', { name: 'reconciliation-daily' })
    async runDaily(): Promise<void> {
        if (this.config.get<string>('RECONCILIATION_CRON_ENABLED') === 'false') return;

        const tenantIds = await this.runs.listTenantIds();
        for (const tenantId of tenantIds) {
            await RequestContext.run(
                { correlationId: randomUUID(), source: 'SCHEDULER', tenantId, userId: SYSTEM_USER_ID },
                async () => {
                    try {
                        await this.monitor.runForTenant(tenantId, 'SCHEDULED');
                    } catch (err) {
                        this.logger.error({
                            msg: 'scheduled reconciliation failed',
                            tenantId,
                            error: err instanceof Error ? err.message : String(err),
                        });
                    }
                },
            );
        }
    }
}
