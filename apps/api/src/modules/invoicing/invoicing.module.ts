import { Module } from '@nestjs/common';
import { InvoiceTypesModule } from './invoice-types/invoice-types.module';
import { CashboxesModule } from './cashboxes/cashboxes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
    imports: [InvoiceTypesModule, CashboxesModule, InvoicesModule, PaymentsModule],
    exports: [InvoiceTypesModule, CashboxesModule, InvoicesModule, PaymentsModule],
})
export class InvoicingModule {}
