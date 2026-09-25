import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { SalesCheckoutFacade } from './sales-checkout.facade';

@Module({
    imports: [PrismaModule, DocumentSequencesModule, InvoicesModule, PaymentsModule],
    providers: [SalesCheckoutFacade],
    exports: [SalesCheckoutFacade],
})
export class SalesCheckoutModule {}
