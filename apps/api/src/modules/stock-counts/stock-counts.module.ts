import { Module } from '@nestjs/common';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';
import { InventoryModule } from '../inventory/inventory.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';

@Module({
    imports: [InventoryModule, DocumentSequencesModule],
    controllers: [StockCountsController],
    providers: [StockCountsService],
    exports: [StockCountsService],
})
export class StockCountsModule {}
