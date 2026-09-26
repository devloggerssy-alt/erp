import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InvoiceTypesService } from './services/invoice-types.service';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto } from './dto';
import { INVOICE_TYPES_FILTER_SCHEMA } from './controllers/invoice-types.controller';

@AiToolProvider()
@Injectable()
export class InvoiceTypesAiTools implements AiToolSource {
    constructor(private readonly invoiceTypes: InvoiceTypesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'invoice-types',
            resource: resources.invoiceTypes.key,
            domain: 'invoicing',
            label: 'invoice type',
            service: this.invoiceTypes,
            createDto: CreateInvoiceTypeDto,
            updateDto: UpdateInvoiceTypeDto,
            filterSchema: INVOICE_TYPES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'invoiceTypes.view', create: 'invoiceTypes.create', update: 'invoiceTypes.update' },
        });
    }
}
