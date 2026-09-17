import { Module } from '@nestjs/common';
import { BalanceDriftService } from './services/balance-drift.service';
import { BusinessSetupReconciliationService } from './services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from './services/reconciliation-monitor.service';
import { ReconciliationRunsRepository } from './repositories/reconciliation-runs.repository';
import { BalanceDriftController } from './controllers/balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService, BusinessSetupReconciliationService, ReconciliationRunsRepository, ReconciliationMonitorService],
    exports: [BalanceDriftService, BusinessSetupReconciliationService, ReconciliationMonitorService],
})
export class ReconciliationModule {}
