import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { InvoiceTypesService } from './invoice-types.service';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Invoice Types')
@Controller('invoice-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InvoiceTypesController {
    constructor(private readonly invoiceTypesService: InvoiceTypesService) {}

    @Get()
    @ApiOperation({ summary: 'List all invoice types' })
    @ApiOkResponse({
        description: 'Invoice types list retrieved',
        schema: {
            example: {
                message: 'Invoice types list',
                data: [
                    { id: '00000000-0000-4000-ad00-000000000001', name: 'Purchase Invoice', direction: 'PURCHASE', isActive: true },
                    { id: '00000000-0000-4000-ad00-000000000002', name: 'Sales Invoice', direction: 'SALE', isActive: true },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const result = await this.invoiceTypesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(result, 'Invoice types list');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get invoice type by ID' })
    @ApiOkResponse({
        description: 'Invoice type details returned',
        schema: {
            example: {
                message: 'Invoice type details',
                data: { id: '00000000-0000-4000-ad00-000000000001', name: 'Purchase Invoice', direction: 'PURCHASE', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const type = await this.invoiceTypesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(type, 'Invoice type details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice type' })
    @ApiCreatedResponse({
        description: 'Invoice type created',
        schema: {
            example: {
                message: 'Invoice type created',
                data: { id: '00000000-0000-4000-ad00-000000000003', name: 'Return Invoice', direction: 'SALE', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateInvoiceTypeDto) {
        const created = await this.invoiceTypesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Invoice type created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an invoice type' })
    @ApiOkResponse({
        description: 'Invoice type updated',
        schema: {
            example: {
                message: 'Invoice type updated',
                data: { id: '00000000-0000-4000-ad00-000000000001', name: 'Purchase Invoice (Updated)' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateInvoiceTypeDto,
    ) {
        const updated = await this.invoiceTypesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Invoice type updated');
    }
}
