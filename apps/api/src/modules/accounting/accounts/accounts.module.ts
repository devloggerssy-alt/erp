import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { PostingModule } from '../posting';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './services/accounts.service';
import { AccountPresenter } from './presenters/account.presenter';
import { AccountsController } from './controllers/accounts.controller';
import { AccountBalancesController } from './controllers/account-balances.controller';
import { OpeningBalancesController } from './controllers/opening-balances.controller';
import { AccountBalancesService } from './services/account-balances.service';
import { OpeningBalancesService } from './services/opening-balances.service';

@Module({
    imports: [FinancialSettingsModule, PostingModule],
    controllers: [AccountsController, AccountBalancesController, OpeningBalancesController],
    providers: [
        AccountsRepository,
        AccountsService,
        AccountPresenter,
        AccountBalancesService,
        OpeningBalancesService,
        LocaleResolverService,
    ],
    exports: [AccountsService],
})
export class AccountsModule {}