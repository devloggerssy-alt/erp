import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '@devloggers/db-prisma/nest'
import type { AccountType } from '@devloggers/db-prisma'
import { ReferenceType } from '@devloggers/db-prisma'
import { JournalPostingService } from './journal-posting.service'
import type { PostingJournalLine } from './journal-posting.service'
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service'
import { assertFiscalPeriodOpen } from '../utils/assert-period-open'
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto'

@Injectable()
export class OpeningBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalPosting: JournalPostingService,
    private readonly financialSettings: FinancialSettingsService,
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

    const settings = await this.financialSettings.getOrThrow(tenantId)
    const openingEquityAccountId = settings.defaultOpeningEquityAccountId
    if (!openingEquityAccountId) {
      throw new BadRequestException('No default opening equity account configured in Financial Settings')
    }

    const nonZeroEntries = dto.entries.filter((e) => e.amount !== 0)
    if (nonZeroEntries.length === 0) {
      throw new BadRequestException('At least one entry with a non-zero amount is required')
    }

    const accountIds = [...new Set(nonZeroEntries.map((e) => e.accountId)), openingEquityAccountId]
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds }, tenantId },
      select: { id: true, code: true, type: true, isPostable: true, isActive: true, deletedAt: true },
    })

    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    for (const entry of nonZeroEntries) {
      const account = accountMap.get(entry.accountId)
      if (!account) {
        throw new BadRequestException(`Account not found: ${entry.accountId}`)
      }
      if (!account.isPostable || account.deletedAt) {
        throw new BadRequestException(`Account "${account.code}" is not postable`)
      }
      if (!account.isActive) {
        throw new BadRequestException(`Account "${account.code}" is not active`)
      }
      const allowedTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY']
      if (!allowedTypes.includes(account.type)) {
        throw new BadRequestException(`Account "${account.code}" must be ASSET, LIABILITY, or EQUITY (got ${account.type})`)
      }
    }

    const equityAccount = accountMap.get(openingEquityAccountId)
    if (!equityAccount) {
      throw new BadRequestException('Opening equity account not found')
    }

    const lines: PostingJournalLine[] = []
    let totalDebits = 0
    let totalCredits = 0
    let sortOrder = 0

    for (const entry of nonZeroEntries) {
      const account = accountMap.get(entry.accountId)!
      const absAmount = Math.abs(entry.amount)

      if (account.type === 'ASSET') {
        lines.push({
          accountId: entry.accountId,
          debit: entry.amount > 0 ? absAmount : 0,
          credit: entry.amount < 0 ? absAmount : 0,
          description: `Opening balance - ${account.code}`,
          sortOrder: sortOrder++,
        })
        if (entry.amount > 0) totalDebits += absAmount
        else totalCredits += absAmount
      } else {
        lines.push({
          accountId: entry.accountId,
          debit: entry.amount < 0 ? absAmount : 0,
          credit: entry.amount > 0 ? absAmount : 0,
          description: `Opening balance - ${account.code}`,
          sortOrder: sortOrder++,
        })
        if (entry.amount > 0) totalCredits += absAmount
        else totalDebits += absAmount
      }
    }

    const diff = totalDebits - totalCredits
    if (diff !== 0) {
      if (diff > 0) {
        lines.push({
          accountId: openingEquityAccountId,
          debit: 0,
          credit: diff,
          description: 'Opening balance offset',
          sortOrder: sortOrder++,
        })
      } else {
        lines.push({
          accountId: openingEquityAccountId,
          debit: Math.abs(diff),
          credit: 0,
          description: 'Opening balance offset',
          sortOrder: sortOrder++,
        })
      }
    }

    const docSequence = await this.prisma.documentSequence.findFirst({
      where: { tenantId, documentType: 'JOURNAL_ENTRY' },
    })
    const nextNumber = docSequence
      ? `${docSequence.prefix}${String(docSequence.nextNumber).padStart(docSequence.padding, '0')}`
      : `JE-${Date.now()}`

    const result = await this.prisma.$transaction(async (tx) => {
      const je = await this.journalPosting.post(tx, {
        tenantId,
        number: nextNumber,
        date: fiscalPeriod.startDate,
        fiscalPeriodId: fiscalPeriod.id,
        fiscalPeriodStatus: fiscalPeriod.status,
        referenceType: ReferenceType.OPENING_BALANCE,
        referenceId: `opening-balance-${Date.now()}`,
        description: 'Opening balances',
        exchangeRate: 1,
        userId,
        lines,
      })

      if (docSequence) {
        await tx.documentSequence.update({
          where: { id: docSequence.id },
          data: { nextNumber: { increment: 1 } },
        })
      }

      return je
    })

    return {
      journalEntryId: result.id,
      entriesCount: nonZeroEntries.length,
    }
  }
}
