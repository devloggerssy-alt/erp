import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { InvoiceTypesController } from './controllers/invoice-types.controller';
import { InvoiceTypesService } from './services/invoice-types.service';
import { InvoiceTypesRepository } from './repositories/invoice-types.repository';
import { InvoiceTypePresenter } from './presenters/invoice-type.presenter';

@Module({
    controllers: [InvoiceTypesController],
    providers: [InvoiceTypesService, InvoiceTypesRepository, InvoiceTypePresenter, LocaleResolverService],
    exports: [InvoiceTypesService],
})
export class InvoiceTypesModule {}
