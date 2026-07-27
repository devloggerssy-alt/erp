import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '@devloggers/db-prisma/nest'
import { AccountingPostingFacade, type OpeningBalancePostedIntent } from '../../posting'
import { assertFiscalPeriodOpen } from '../utils/assert-period-open'
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto'

@Injectable()
export class OpeningBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postingFacade: AccountingPostingFacade,
  ) {}

  async postOpeningBalances(
    tenantId: string,
    userId: string,
    dto: PostAccountOpeningBalanceDto,
  ): Promise<AccountOpeningBalanceResponseDto> {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
      where: { id: dto.fiscalPeriodId, tenantId },
    })
    if (!fiscalPeriod) {
      throw new BadRequestException('Fiscal period not found')
    }
    assertFiscalPeriodOpen(fiscalPeriod.status)

    const nonZeroEntries = dto.entries.filter((e) => e.amount !== 0)
    if (nonZeroEntries.length === 0) {
      throw new BadRequestException('At least one entry with a non-zero amount is required')
    }

    const intent: OpeningBalancePostedIntent = {
      kind: 'OPENING_BALANCE_POSTED',
      tenantId,
      userId,
      date: fiscalPeriod.startDate,
      fiscalPeriodId: fiscalPeriod.id,
      fiscalPeriodStatus: fiscalPeriod.status,
      exchangeRate: 1,
      referenceId: `opening-balance-${Date.now()}`,
      description: 'Opening balances',
      entries: nonZeroEntries.map((e) => ({ accountId: e.accountId, amount: e.amount })),
    }

    const result = await this.prisma.$transaction((tx) => this.postingFacade.record(tx, intent))

    return {
      journalEntryId: result.journalEntryId,
      entriesCount: nonZeroEntries.length,
    }
  }
}
