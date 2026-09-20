import { Controller, Post, Body, Param, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  createCrudController,
  type CrudOpenApi,
  type RequestUser,
  createClassDtoBodyPipe,
  RequirePermission,
} from '@devloggers/backend-core';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';
import { CurrentUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import {
  ApiStandardErrors,
  ApiOkResponseStandard,
  CrudCreate,
} from '../../../common/decorators/api-swagger.decorators';

const PAYMENTS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List payments',
      description: 'Returns a paginated list of payments for the authenticated tenant.',
    },
    responseDescription: 'Paginated list of payments',
  },
  show: {
    operation: { summary: 'Get a payment by ID' },
    responseDescription: 'Payment details',
    idParam: { description: 'Payment UUID' },
  },
  create: {
    operation: {
      summary: 'Create a payment',
      description: 'Creates a new payment. Optionally posts immediately if complete=true.',
    },
    responseDescription: 'Payment created',
  },
  update: {
    operation: {
      summary: 'Update a draft payment',
      description: 'Partial update — only draft payments can be modified.',
    },
    responseDescription: 'Updated payment',
    idParam: { description: 'Payment UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a draft payment',
      description: 'Hard-deletes a draft payment. Posted payments must be cancelled instead.',
    },
    noContentDescription: 'Payment deleted',
    idParam: { description: 'Payment UUID' },
  },
} satisfies CrudOpenApi;

const PaymentsCrudBase = createCrudController({
  responseDto: PaymentResponseDto,
  createDto: CreatePaymentDto,
  updateDto: UpdatePaymentDto,
  permissions: {
    view: 'payments.view',
    create: 'payments.create',
    update: 'payments.update',
    delete: 'payments.delete',
  },
  openApi: PAYMENTS_CRUD_OPENAPI,
});

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController extends PaymentsCrudBase {
  constructor(private readonly paymentsService: PaymentsService) {
    super(paymentsService, 'Payment');
  }

  @Post()
  @RequirePermission('payments.create')
  @CrudCreate(PaymentResponseDto, PAYMENTS_CRUD_OPENAPI.create)
  @ApiBody({ type: CreatePaymentDto, required: true })
  @UsePipes(createClassDtoBodyPipe(CreatePaymentDto))
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    const created = await this.paymentsService.createAs(user.tenantId, user.id, dto);
    return ApiResponseBuilder.success(created, 'Payment created');
  }

  @Post(':id/post')
  @RequirePermission('payments.post')
  @ApiOkResponseStandard(PaymentResponseDto, { description: 'Payment posted' })
  @ApiStandardErrors()
  async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ApiResponseBuilder.success(
      await this.paymentsService.post(user.tenantId, id, user.id),
      'Payment posted',
    );
  }

  @Post(':id/cancel')
  @RequirePermission('payments.cancel')
  @ApiOkResponseStandard(PaymentResponseDto, { description: 'Payment cancelled' })
  @ApiStandardErrors()
  async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ApiResponseBuilder.success(
      await this.paymentsService.cancel(user.tenantId, id, user.id),
      'Payment cancelled',
    );
  }

  @Post(':id/allocate')
  @RequirePermission('payments.allocate')
  @ApiOkResponseStandard(PaymentResponseDto, { description: 'Payment allocated' })
  @ApiStandardErrors()
  async allocate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AllocatePaymentDto,
  ) {
    await this.paymentsService.allocate(user.tenantId, id, dto);
    return ApiResponseBuilder.success(
      await this.paymentsService.findById(user.tenantId, id),
      'Allocation created',
    );
  }

  @Post(':id/allocations/:allocationId/remove')
  @RequirePermission('payments.allocate')
  @ApiOkResponseStandard(PaymentResponseDto, { description: 'Allocation removed' })
  @ApiStandardErrors()
  async removeAllocation(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('allocationId') allocationId: string,
  ) {
    await this.paymentsService.removeAllocation(user.tenantId, id, allocationId);
    return ApiResponseBuilder.success(
      await this.paymentsService.findById(user.tenantId, id),
      'Allocation removed',
    );
  }
}
