import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomFieldsService } from '../services/custom-fields.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@devloggers/backend-core';
import { customFieldModules } from '@devloggers/api-contracts';

const CUSTOM_FIELDS_OPENAPI = {
    list: {
        operation: { summary: 'List custom field definitions' },
        responseDescription: 'Paginated list of custom fields',
    },
    show: {
        operation: { summary: 'Get a custom field by ID' },
        responseDescription: 'Custom field definition',
        idParam: { description: 'Custom field UUID' },
    },
    create: {
        operation: { summary: 'Create a custom field definition' },
        responseDescription: 'Custom field created successfully',
    },
    update: {
        operation: { summary: 'Update a custom field definition' },
        responseDescription: 'Updated custom field',
        idParam: { description: 'Custom field UUID' },
    },
    delete: {
        operation: { summary: 'Delete a custom field definition' },
        noContentDescription: 'Custom field deleted successfully',
        idParam: { description: 'Custom field UUID' },
    },
} satisfies CrudOpenApi;

const CustomFieldsCrudBase = createCrudController({
    responseDto: CustomFieldResponseDto,
    createDto: CreateCustomFieldDto,
    updateDto: UpdateCustomFieldDto,
    filterSchema: [
        { field: 'module', type: 'string' },
        { field: 'type', type: 'string' },
        { field: 'isRequired', type: 'boolean' },
        { field: 'showInList', type: 'boolean' },
        { field: 'createdAt', type: 'date' },
    ],
    openApi: CUSTOM_FIELDS_OPENAPI,
});

@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomFieldsController extends CustomFieldsCrudBase {
    constructor(private readonly customFieldsService: CustomFieldsService) {
        super(customFieldsService, 'Custom field');
    }

    @Get('by-module')
    @ApiOperation({ summary: 'List all custom fields for a module (non-paginated)' })
    @ApiQuery({ name: 'module', enum: Object.values(customFieldModules) })
    async listByModule(
        @CurrentUser() user: RequestUser,
        @Query('module') module: string,
    ) {
        const data = await this.customFieldsService.listByModule(user.tenantId, module);
        return { data };
    }
}
