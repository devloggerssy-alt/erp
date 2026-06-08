import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PartiesService } from './parties.service';
import { CreatePartyDto, UpdatePartyDto, PartyResponseDto } from './dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '../identity/auth/guards';

const PARTIES_CRUD_OPENAPI = {
    list: {
        operation: { summary: 'List parties', description: 'Returns a paginated list of customers, suppliers, and combined parties.' },
        responseDescription: 'Paginated list of parties',
    },
    show: {
        operation: { summary: 'Get a party by ID' },
        responseDescription: 'Party details',
        idParam: { description: 'Party UUID' },
    },
    create: {
        operation: { summary: 'Create a party', description: 'Creates a new customer, supplier, or customer-supplier party.' },
        responseDescription: 'Party created successfully',
    },
    update: {
        operation: { summary: 'Update a party', description: 'Partial update — only provided fields are changed.' },
        responseDescription: 'Updated party',
        idParam: { description: 'Party UUID' },
    },
    delete: {
        operation: { summary: 'Delete a party', description: 'Hard-deletes the party. Will fail if the party has associated transactions.' },
        noContentDescription: 'Party deleted successfully',
        idParam: { description: 'Party UUID' },
    },
} satisfies CrudOpenApi;

const PartiesCrudBase = createCrudController({
    responseDto: PartyResponseDto,
    createDto: CreatePartyDto,
    updateDto: UpdatePartyDto,
    filterSchema: [
        { field: 'name', type: 'string' },
        { field: 'code', type: 'string' },
        { field: 'type', type: 'enum', enumValues: ['CUSTOMER', 'SUPPLIER', 'CUSTOMER_SUPPLIER'] },
        { field: 'isActive', type: 'boolean' },
        { field: 'createdAt', type: 'date' },
    ],
    openApi: PARTIES_CRUD_OPENAPI,
});

@ApiTags('Parties')
@Controller('parties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PartiesController extends PartiesCrudBase {
    constructor(private readonly partiesService: PartiesService) {
        super(partiesService, 'Party');
    }
}
