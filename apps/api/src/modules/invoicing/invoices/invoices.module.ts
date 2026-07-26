import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { PostingModule } from '../../accounting/posting';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DocumentSequencesModule, PostingModule, InventoryModule, PaymentsModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoicePostingService, InvoicePresenter, LocaleResolverService],
    exports: [InvoicesService, InvoicePostingService],
})
export class InvoicesModule {}
