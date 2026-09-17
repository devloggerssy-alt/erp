import { Module } from '@nestjs/common';
import { BalanceDriftService } from './services/balance-drift.service';
import { BusinessSetupReconciliationService } from './services/business-setup-reconciliation.service';
import { BalanceDriftController } from './controllers/balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService, BusinessSetupReconciliationService],
    exports: [BalanceDriftService, BusinessSetupReconciliationService],
})
export class ReconciliationModule {}
