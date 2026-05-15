import { Module } from '@nestjs/common';
import { FiscalPeriodsController } from './controllers/fiscal-periods.controller';
import { FiscalPeriodsService } from './services/fiscal-periods.service';
import { FiscalPeriodsRepository } from './repositories/fiscal-periods.repository';
import { FiscalPeriodPresenter } from './presenters/fiscal-period.presenter';

@Module({
    controllers: [FiscalPeriodsController],
    providers: [FiscalPeriodsService, FiscalPeriodsRepository, FiscalPeriodPresenter],
    exports: [FiscalPeriodsService],
})
export class FiscalPeriodsModule {}
