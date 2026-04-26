import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get()
    @ApiOperation({ summary: 'List all payments' })
    @ApiQuery({ name: 'type', required: false, enum: ['RECEIPT', 'PAYMENT', 'EXPENSE', 'ADJUSTMENT'] })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'CANCELLED'] })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({
        description: 'Paginated list of payments',
        schema: {
            example: {
                message: 'Payments list',
                data: [
                    { id: '...', number: 'PAY-000001', type: 'RECEIPT', status: 'DRAFT', amount: 500000, partyId: '00000000-0000-4000-aa00-000000000001' },
                ],
                meta: { pagination: { total: 3, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser, @Query('type') type?: string, @Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.paymentsService.findAll(user.tenantId, { type, status, page: page ? Number(page) : 1, limit: limit ? Number(limit) : 50 });
        return ApiResponseBuilder.success(result.data, 'Payments list', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment by ID' })
    @ApiOkResponse({
        description: 'Payment details returned',
        schema: {
            example: {
                message: 'Payment details',
                data: { id: '...', number: 'PAY-000001', type: 'RECEIPT', status: 'DRAFT', amount: 500000, allocations: [] },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.paymentsService.findById(user.tenantId, id), 'Payment details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new payment' })
    @ApiCreatedResponse({
        description: 'Payment created in DRAFT status',
        schema: {
            example: {
                message: 'Payment created',
                data: { id: '...', number: 'PAY-000002', type: 'RECEIPT', status: 'DRAFT', amount: 300000 },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
        return ApiResponseBuilder.success(await this.paymentsService.create(user.tenantId, user.id, dto), 'Payment created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft payment' })
    @ApiOkResponse({
        description: 'Payment updated',
        schema: {
            example: {
                message: 'Payment updated',
                data: { id: '...', amount: 350000, status: 'DRAFT' },
            },
        },
    })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
        return ApiResponseBuilder.success(await this.paymentsService.update(user.tenantId, id, dto), 'Payment updated');
    }

    @Post(':id/post')
    @ApiOperation({
        summary: 'Post (confirm) a payment',
        description: 'Transitions a DRAFT payment to POSTED status. This updates the cashbox balance and creates accounting journal entries. For receipts, the cashbox balance increases; for payments/expenses, it decreases.',
    })
    @ApiOkResponse({
        description: 'Payment posted – cashbox and journal entries updated',
        schema: {
            example: {
                message: 'Payment posted',
                data: { id: '...', status: 'POSTED', postedAt: '2026-04-14T12:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.paymentsService.post(user.tenantId, id, user.id), 'Payment posted');
    }

    @Post(':id/cancel')
    @ApiOperation({
        summary: 'Cancel a posted payment',
        description: 'Reverses a POSTED payment by restoring the cashbox balance and creating counter journal entries. Only posted payments can be cancelled.',
    })
    @ApiOkResponse({
        description: 'Payment cancelled – reversing entries created',
        schema: {
            example: {
                message: 'Payment cancelled',
                data: { id: '...', status: 'CANCELLED', cancelledAt: '2026-04-14T14:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.paymentsService.cancel(user.tenantId, id, user.id), 'Payment cancelled');
    }

    @Post(':id/allocate')
    @ApiOperation({
        summary: 'Allocate payment to invoices',
        description: 'Links a posted payment to one or more invoices, recording how much of the payment amount settles each invoice. Partially allocated payments remain open for future allocations.',
    })
    @ApiOkResponse({
        description: 'Payment allocated to invoices',
        schema: {
            example: {
                message: 'Payment allocated',
                data: { id: '...', allocations: [{ invoiceId: '...', amount: 300000 }] },
            },
        },
    })
    @ApiStandardErrors()
    async allocate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AllocatePaymentDto) {
        return ApiResponseBuilder.success(await this.paymentsService.allocate(user.tenantId, id, dto), 'Payment allocated');
    }

    @Delete(':id/allocations/:allocationId')
    @ApiOperation({
        summary: 'Remove a payment allocation',
        description: 'Removes a specific allocation link between a payment and an invoice, freeing the allocated amount.',
    })
    @ApiOkResponse({
        description: 'Allocation removed',
        schema: { example: { message: 'Allocation removed', data: null } },
    })
    @ApiStandardErrors()
    async removeAllocation(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('allocationId') allocationId: string) {
        await this.paymentsService.removeAllocation(user.tenantId, id, allocationId);
        return ApiResponseBuilder.success(null, 'Allocation removed');
    }
}
