import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { CurrenciesModule } from './currencies/currencies.module';
import { FiscalPeriodsModule } from './fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from './document-sequences/document-sequences.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
    imports: [CurrenciesModule, FiscalPeriodsModule, DocumentSequencesModule, AccountsModule],
    controllers: [AccountingController],
    providers: [AccountingService],
    exports: [AccountingService, CurrenciesModule, FiscalPeriodsModule, DocumentSequencesModule, AccountsModule],
})
export class AccountingModule {}
