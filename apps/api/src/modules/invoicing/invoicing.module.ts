import { Module } from '@nestjs/common';
import { InvoiceTypesModule } from './invoice-types/invoice-types.module';
import { CashboxesModule } from './cashboxes/cashboxes.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
    imports: [InvoiceTypesModule, CashboxesModule, BankAccountsModule, InvoicesModule, PaymentsModule, ExpensesModule],
    exports: [InvoiceTypesModule, CashboxesModule, BankAccountsModule, InvoicesModule, PaymentsModule, ExpensesModule],
})
export class InvoicingModule {}
