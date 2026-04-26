import { Module } from '@nestjs/common';
import { StockLedgerController } from './stock-ledger.controller';
import { StockLedgerService } from './stock-ledger.service';

@Module({
    controllers: [StockLedgerController],
    providers: [StockLedgerService],
    exports: [StockLedgerService],
})
export class StockLedgerModule {}
