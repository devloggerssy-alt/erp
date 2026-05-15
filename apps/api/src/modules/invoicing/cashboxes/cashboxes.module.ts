import { Module } from '@nestjs/common';
import { CashboxesController } from './controllers/cashboxes.controller';
import { CashboxesService } from './services/cashboxes.service';
import { CashboxesRepository } from './repositories/cashboxes.repository';
import { CashboxPresenter } from './presenters/cashbox.presenter';

@Module({
    controllers: [CashboxesController],
    providers: [CashboxesService, CashboxesRepository, CashboxPresenter],
    exports: [CashboxesService],
})
export class CashboxesModule {}
