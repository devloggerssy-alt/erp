import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountBalancesService } from '../services/account-balances.service';
import { AccountBalanceDto, AccountLedgerLineDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import {
  ApiStandardErrors,
  ApiOkResponseStandard,
  ApiOkResponsePaginated,
} from '@/common/decorators/api-swagger.decorators';

@ApiTags('Accounting / Account Balances')
@Controller('accounting/account-balances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AccountBalancesController {
  constructor(private readonly service: AccountBalancesService) {}

  @Get()
  @ApiOperation({
    summary: 'List account balances',
    description:
      'All chart-of-accounts entries with ledger-computed own and rolled-up balances (POSTED entries only).',
  })
  @ApiOkResponseStandard(AccountBalanceDto, { isArray: true, description: 'Account balances' })
  @ApiStandardErrors()
  async list(@CurrentUser() user: RequestUser) {
    const data = await this.service.getBalances(user.tenantId);
    return ApiResponseBuilder.success(data, 'Account balances');
  }

  @Get(':id/ledger')
  @ApiOperation({
    summary: 'Get an account ledger',
    description: 'Paginated POSTED journal lines posted to a single account, newest entry first.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponsePaginated(AccountLedgerLineDto, { description: 'Account ledger lines' })
  @ApiStandardErrors()
  async ledger(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.service.getLedger(
      user.tenantId,
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
    return ApiResponseBuilder.success(result.data, 'Account ledger lines', {
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }
}
