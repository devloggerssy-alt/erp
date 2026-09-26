import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { InvoiceTypesController } from './controllers/invoice-types.controller';
import { InvoiceTypesService } from './services/invoice-types.service';
import { InvoiceTypesRepository } from './repositories/invoice-types.repository';
import { InvoiceTypePresenter } from './presenters/invoice-type.presenter';
import { InvoiceTypesAiTools } from './invoice-types.ai-tools';

@Module({
    controllers: [InvoiceTypesController],
    providers: [InvoiceTypesService, InvoiceTypesRepository, InvoiceTypePresenter, LocaleResolverService, InvoiceTypesAiTools],
    exports: [InvoiceTypesService],
})
export class InvoiceTypesModule {}
