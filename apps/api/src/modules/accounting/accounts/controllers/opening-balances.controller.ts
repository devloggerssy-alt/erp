import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '@/common/decorators/api-swagger.decorators';
import { OpeningBalancesService } from '../services/opening-balances.service';
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto';

@ApiTags('Accounting / Opening Balances')
@Controller('accounting/opening-balances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OpeningBalancesController {
  constructor(private readonly openingBalancesService: OpeningBalancesService) {}

  @Post()
  @ApiOperation({ summary: 'Post opening balances for chart of accounts' })
  @ApiOkResponseStandard(AccountOpeningBalanceResponseDto, { description: 'Opening balances posted' })
  @ApiStandardErrors()
  async postOpeningBalances(
    @CurrentUser() user: RequestUser,
    @Body() dto: PostAccountOpeningBalanceDto,
  ) {
    const result = await this.openingBalancesService.postOpeningBalances(
      user.tenantId,
      user.id,
      dto,
    );
    return ApiResponseBuilder.success(result, 'Opening balances posted successfully');
  }
}
