import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { StockLedgerController } from './stock-ledger.controller';
import { StockLedgerService } from './stock-ledger.service';
import { StockLedgerRepository } from './repositories/stock-ledger.repository';
import { StockMovementPresenter } from './presenters/stock-movement.presenter';

@Module({
    imports: [PrismaModule],
    controllers: [StockLedgerController],
    providers: [StockLedgerService, StockLedgerRepository, StockMovementPresenter],
    exports: [StockLedgerService],
})
export class StockLedgerModule {}
