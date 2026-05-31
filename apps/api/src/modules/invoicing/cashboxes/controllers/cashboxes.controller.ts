import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CashboxesService } from '../services/cashboxes.service';
import { CreateCashboxDto, UpdateCashboxDto, CashboxResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const CASHBOXES_OPENAPI = {
    list: {
        operation: { summary: 'List cashboxes' },
        responseDescription: 'Paginated list of cashboxes',
    },
    show: {
        operation: { summary: 'Get a cashbox by ID' },
        responseDescription: 'Cashbox details',
        idParam: { description: 'Cashbox UUID' },
    },
    create: {
        operation: { summary: 'Create a cashbox', description: 'Cashbox code must be unique within the tenant.' },
        responseDescription: 'Cashbox created successfully',
    },
    update: {
        operation: { summary: 'Update a cashbox' },
        responseDescription: 'Updated cashbox',
        idParam: { description: 'Cashbox UUID' },
    },
    delete: {
        operation: { summary: 'Delete a cashbox' },
        noContentDescription: 'Cashbox deleted successfully',
        idParam: { description: 'Cashbox UUID' },
    },
} satisfies CrudOpenApi;

const CashboxesCrudBase = createCrudController({
    responseDto: CashboxResponseDto,
    createDto: CreateCashboxDto,
    updateDto: UpdateCashboxDto,
    openApi: CASHBOXES_OPENAPI,
});

@ApiTags('Invoicing / Cashboxes')
@Controller('cashboxes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CashboxesController extends CashboxesCrudBase {
    constructor(private readonly cashboxesService: CashboxesService) {
        super(cashboxesService, 'Cashbox');
    }
}
