import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly postingService: InvoicePostingService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all invoices' })
    @ApiQuery({ name: 'direction', required: false, enum: ['PURCHASE', 'SALE'] })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'CANCELLED'] })
    @ApiQuery({ name: 'partyId', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({
        description: 'Paginated list of invoices',
        schema: {
            example: {
                message: 'Invoices list',
                data: [
                    {
                        id: '00000000-0000-4000-ae00-000000000001',
                        number: 'PUR-000001',
                        date: '2026-04-14',
                        status: 'DRAFT',
                        direction: 'PURCHASE',
                        totalAmount: 5740000,
                        party: { id: '00000000-0000-4000-aa00-000000000004', name: 'Damascus Import Co.' },
                    },
                ],
                meta: { pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(
        @CurrentUser() user: RequestUser,
        @Query('direction') direction?: string,
        @Query('status') status?: string,
        @Query('partyId') partyId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.invoicesService.findAll(user.tenantId, {
            direction,
            status,
            partyId,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });

        return ApiResponseBuilder.success(result.data, 'Invoices list', {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get invoice by ID' })
    @ApiOkResponse({
        description: 'Invoice details with lines',
        schema: {
            example: {
                message: 'Invoice details',
                data: {
                    id: '00000000-0000-4000-ae00-000000000001',
                    number: 'PUR-000001',
                    date: '2026-04-14',
                    status: 'DRAFT',
                    totalAmount: 5740000,
                    lines: [
                        { id: '...', itemId: '00000000-0000-4000-a900-000000000001', quantity: 5, unitPrice: 600000, lineTotal: 2940000 },
                    ],
                },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const invoice = await this.invoicesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(invoice, 'Invoice details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiCreatedResponse({
        description: 'Invoice created in DRAFT status',
        schema: {
            example: {
                message: 'Invoice created',
                data: {
                    id: '00000000-0000-4000-ae00-000000000002',
                    number: 'PUR-000002',
                    date: '2026-04-14',
                    status: 'DRAFT',
                    totalAmount: 5740000,
                },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateInvoiceDto) {
        const created = await this.invoicesService.create(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(created, 'Invoice created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft invoice' })
    @ApiOkResponse({
        description: 'Invoice updated',
        schema: {
            example: {
                message: 'Invoice updated',
                data: { id: '00000000-0000-4000-ae00-000000000001', status: 'DRAFT', totalAmount: 6000000 },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateInvoiceDto,
    ) {
        const updated = await this.invoicesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Invoice updated');
    }

    @Post(':id/post')
    @ApiOperation({
        summary: 'Post (confirm) an invoice',
        description: 'Transitions a DRAFT invoice to POSTED status. For purchase invoices this increases warehouse stock and creates accounting journal entries. For sales invoices this decreases stock and records revenue. This action is irreversible — use cancel instead.',
    })
    @ApiOkResponse({
        description: 'Invoice posted – stock and journal entries created',
        schema: {
            example: {
                message: 'Invoice posted successfully',
                data: { id: '00000000-0000-4000-ae00-000000000001', status: 'POSTED', postedAt: '2026-04-14T12:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async postInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        // Determine direction from the invoice type to route to correct posting logic
        const invoice = await this.invoicesService.findById(user.tenantId, id);
        
        let posted;
        if (invoice.invoiceType.direction === 'PURCHASE') {
            posted = await this.postingService.postPurchaseInvoice(user.tenantId, id, user.id);
        } else {
            posted = await this.postingService.postSalesInvoice(user.tenantId, id, user.id);
        }

        return ApiResponseBuilder.success(posted, 'Invoice posted successfully');
    }

    @Post(':id/cancel')
    @ApiOperation({
        summary: 'Cancel a posted invoice',
        description: 'Reverses a POSTED invoice by creating counter journal entries and restoring stock quantities. The invoice status changes to CANCELLED. Only posted invoices can be cancelled.',
    })
    @ApiOkResponse({
        description: 'Invoice cancelled – reversing entries created',
        schema: {
            example: {
                message: 'Invoice cancelled successfully',
                data: { id: '00000000-0000-4000-ae00-000000000001', status: 'CANCELLED', cancelledAt: '2026-04-14T14:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async cancelInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const cancelled = await this.postingService.cancelInvoice(user.tenantId, id, user.id);
        return ApiResponseBuilder.success(cancelled, 'Invoice cancelled successfully');
    }
}
