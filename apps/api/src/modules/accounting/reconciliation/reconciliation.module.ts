import { Module } from '@nestjs/common';
import { BalanceDriftService } from './balance-drift.service';
import { BalanceDriftController } from './balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService],
    exports: [BalanceDriftService],
})
export class ReconciliationModule {}
