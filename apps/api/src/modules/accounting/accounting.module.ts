import { Module } from '@nestjs/common';
import { CurrenciesModule } from './currencies/currencies.module';
import { FiscalPeriodsModule } from './fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from './document-sequences/document-sequences.module';
import { AccountsModule } from './accounts/accounts.module';
import { FinancialSettingsModule } from './financial-settings/financial-settings.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { OpeningBalancesModule } from './opening-balances/opening-balances.module';

@Module({
    imports: [CurrenciesModule, FiscalPeriodsModule, DocumentSequencesModule, AccountsModule, FinancialSettingsModule, ReconciliationModule, JournalEntriesModule, OpeningBalancesModule],
    exports: [CurrenciesModule, FiscalPeriodsModule, DocumentSequencesModule, AccountsModule, FinancialSettingsModule, ReconciliationModule, JournalEntriesModule, OpeningBalancesModule],
})
export class AccountingModule {}
