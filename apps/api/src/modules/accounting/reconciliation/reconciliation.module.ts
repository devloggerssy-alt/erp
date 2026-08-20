import { Module } from '@nestjs/common';
import { BalanceDriftService } from './services/balance-drift.service';
import { BalanceDriftController } from './controllers/balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService],
    exports: [BalanceDriftService],
})
export class ReconciliationModule {}
