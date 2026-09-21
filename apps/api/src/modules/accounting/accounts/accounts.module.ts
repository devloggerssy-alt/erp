import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { PostingModule } from '../posting';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './services/accounts.service';
import { AccountPresenter } from './presenters/account.presenter';
import { AccountsController } from './controllers/accounts.controller';
import { AccountBalancesController } from './controllers/account-balances.controller';
import { AccountBalancesService } from './services/account-balances.service';

@Module({
    imports: [FinancialSettingsModule, PostingModule],
    controllers: [AccountsController, AccountBalancesController],
    providers: [
        AccountsRepository,
        AccountsService,
        AccountPresenter,
        AccountBalancesService,
        LocaleResolverService,
    ],
    exports: [AccountsService],
})
export class AccountsModule {}
