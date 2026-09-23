import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { CodeSequencesModule } from '@/modules/platform';
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { BankAccountsService } from './services/bank-accounts.service';
import { BankAccountsRepository } from './repositories/bank-accounts.repository';
import { BankAccountPresenter } from './presenters/bank-account.presenter';

@Module({
    imports: [CodeSequencesModule],
    controllers: [BankAccountsController],
    providers: [BankAccountsService, BankAccountsRepository, BankAccountPresenter, LocaleResolverService],
    exports: [BankAccountsService],
})
export class BankAccountsModule {}
