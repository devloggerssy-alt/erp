import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { CurrenciesController } from './controllers/currencies.controller';
import { CurrenciesService } from './services/currencies.service';
import { CurrenciesRepository } from './repositories/currencies.repository';
import { CurrencyPresenter } from './presenters/currency.presenter';

@Module({
    controllers: [CurrenciesController],
    providers: [CurrenciesService, CurrenciesRepository, CurrencyPresenter, LocaleResolverService],
    exports: [CurrenciesService],
})
export class CurrenciesModule {}
