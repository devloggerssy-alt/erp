import { Module } from '@nestjs/common';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './services/accounts.service';
import { AccountPresenter } from './presenters/account.presenter';
import { AccountsController } from './controllers/accounts.controller';

@Module({
    controllers: [AccountsController],
    providers: [AccountsRepository, AccountsService, AccountPresenter],
    exports: [AccountsService],
})
export class AccountsModule {}
