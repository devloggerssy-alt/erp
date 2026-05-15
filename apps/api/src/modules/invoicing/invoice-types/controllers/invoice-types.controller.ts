import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceTypesService } from '../services/invoice-types.service';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto, InvoiceTypeResponseDto } from '../dto';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const INVOICE_TYPES_OPENAPI = {
    list: {
        operation: { summary: 'List invoice types' },
        responseDescription: 'Paginated list of invoice types',
    },
    show: {
        operation: { summary: 'Get an invoice type by ID' },
        responseDescription: 'Invoice type details',
        idParam: { description: 'Invoice type UUID' },
    },
    create: {
        operation: { summary: 'Create an invoice type', description: 'Code must be unique within the tenant.' },
        responseDescription: 'Invoice type created successfully',
    },
    update: {
        operation: { summary: 'Update an invoice type' },
        responseDescription: 'Updated invoice type',
        idParam: { description: 'Invoice type UUID' },
    },
    delete: {
        operation: { summary: 'Delete an invoice type' },
        noContentDescription: 'Invoice type deleted successfully',
        idParam: { description: 'Invoice type UUID' },
    },
} satisfies StandardCrudOpenApi;

const InvoiceTypesCrudBase = createStandardCrudControllerBase({
    responseDto: InvoiceTypeResponseDto,
    createDto: CreateInvoiceTypeDto,
    updateDto: UpdateInvoiceTypeDto,
    openApi: INVOICE_TYPES_OPENAPI,
});

@ApiTags('Invoicing / Invoice Types')
@Controller('invoice-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InvoiceTypesController extends InvoiceTypesCrudBase {
    constructor(private readonly invoiceTypesService: InvoiceTypesService) {
        super(invoiceTypesService, 'Invoice Type');
    }
}
