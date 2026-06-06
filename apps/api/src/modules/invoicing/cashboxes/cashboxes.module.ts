import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { CashboxesController } from './controllers/cashboxes.controller';
import { CashboxesService } from './services/cashboxes.service';
import { CashboxesRepository } from './repositories/cashboxes.repository';
import { CashboxPresenter } from './presenters/cashbox.presenter';

@Module({
    controllers: [CashboxesController],
    providers: [CashboxesService, CashboxesRepository, CashboxPresenter, LocaleResolverService],
    exports: [CashboxesService],
})
export class CashboxesModule {}
