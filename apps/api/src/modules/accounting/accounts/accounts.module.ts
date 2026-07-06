import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './services/accounts.service';
import { AccountPresenter } from './presenters/account.presenter';
import { AccountsController } from './controllers/accounts.controller';
import { AccountBalancesController } from './controllers/account-balances.controller';
import { AccountBalancesService } from './services/account-balances.service';

@Module({
    controllers: [AccountsController, AccountBalancesController],
    providers: [AccountsRepository, AccountsService, AccountPresenter, AccountBalancesService, LocaleResolverService],
    exports: [AccountsService],
})
export class AccountsModule {}
