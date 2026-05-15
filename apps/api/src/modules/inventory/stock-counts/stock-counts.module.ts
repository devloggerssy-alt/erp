import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';
import { StockCountsRepository } from './repositories/stock-counts.repository';
import { StockCountPresenter } from './presenters/stock-count.presenter';
import { InventoryModule } from '../inventory.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';

@Module({
    imports: [PrismaModule, InventoryModule, DocumentSequencesModule],
    controllers: [StockCountsController],
    providers: [StockCountsService, StockCountsRepository, StockCountPresenter],
    exports: [StockCountsService],
})
export class StockCountsModule {}
