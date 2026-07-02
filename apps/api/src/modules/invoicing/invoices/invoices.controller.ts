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
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import { CreateInvoiceDto, UpdateInvoiceDto, AddInvoicePaymentDto, InvoiceResponseDto } from './dto';
import { JwtAuthGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import {
    ApiStandardErrors,
    ApiOkResponseStandard,
    ApiOkResponsePaginated,
    ApiCreatedResponseStandard,
} from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly postingService: InvoicePostingService,
        private readonly presenter: InvoicePresenter,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all invoices' })
    @ApiQuery({ name: 'direction', required: false, enum: ['PURCHASE', 'SALE'] })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'CANCELLED'] })
    @ApiQuery({ name: 'partyId', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponsePaginated(InvoiceResponseDto, { description: 'Paginated list of invoices' })
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

        const data = this.presenter.toListResponseList(result.data);

        return ApiResponseBuilder.success(data, 'Invoices list', {
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
    @ApiOkResponseStandard(InvoiceResponseDto, { description: 'Invoice details with lines' })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const invoice = await this.invoicesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(this.presenter.toDetailResponse(invoice), 'Invoice details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiCreatedResponseStandard(InvoiceResponseDto, { description: 'Invoice created in DRAFT status' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateInvoiceDto) {
        const created = await this.invoicesService.create(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(this.presenter.toDetailResponse(created), 'Invoice created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft invoice' })
    @ApiOkResponseStandard(InvoiceResponseDto, { description: 'Invoice updated' })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateInvoiceDto,
    ) {
        const updated = await this.invoicesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(this.presenter.toDetailResponse(updated), 'Invoice updated');
    }

    @Post(':id/payments')
    @ApiOperation({
        summary: 'Add a payment to a posted invoice',
        description: 'Creates, posts, and allocates a new payment against an already-posted invoice — the way to bring a partially-paid invoice toward fully paid. Rejects amounts exceeding the invoice\'s remaining balance.',
    })
    @ApiOkResponseStandard(InvoiceResponseDto, { description: 'Invoice with the new payment allocated' })
    @ApiStandardErrors()
    async addPayment(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: AddInvoicePaymentDto,
    ) {
        const updated = await this.invoicesService.addPayment(user.tenantId, user.id, id, dto);
        return ApiResponseBuilder.success(this.presenter.toDetailResponse(updated), 'Payment added to invoice');
    }

    @Post(':id/post')
    @ApiOperation({
        summary: 'Post (confirm) an invoice',
        description: 'Transitions a DRAFT invoice to POSTED status. For purchase invoices this increases warehouse stock and creates accounting journal entries. For sales invoices this decreases stock and records revenue. This action is irreversible — use cancel instead.',
    })
    @ApiOkResponseStandard(InvoiceResponseDto, { description: 'Invoice posted – stock and journal entries created' })
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

        return ApiResponseBuilder.success(this.presenter.toDetailResponse(posted), 'Invoice posted successfully');
    }

    @Post(':id/cancel')
    @ApiOperation({
        summary: 'Cancel a posted invoice',
        description: 'Reverses a POSTED invoice by creating counter journal entries and restoring stock quantities. The invoice status changes to CANCELLED. Only posted invoices can be cancelled.',
    })
    @ApiOkResponseStandard(InvoiceResponseDto, { description: 'Invoice cancelled – reversing entries created' })
    @ApiStandardErrors()
    async cancelInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const cancelled = await this.postingService.cancelInvoice(user.tenantId, id, user.id);
        return ApiResponseBuilder.success(this.presenter.toDetailResponse(cancelled), 'Invoice cancelled successfully');
    }
}
