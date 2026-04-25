import { Module } from '@nestjs/common';
import { InvoiceTypesController } from './invoice-types.controller';
import { InvoiceTypesService } from './invoice-types.service';

@Module({
    controllers: [InvoiceTypesController],
    providers: [InvoiceTypesService],
    exports: [InvoiceTypesService],
})
export class InvoiceTypesModule {}
