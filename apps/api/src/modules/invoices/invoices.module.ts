import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [DocumentSequencesModule, InventoryModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoicePostingService],
    exports: [InvoicesService, InvoicePostingService],
})
export class InvoicesModule {}
