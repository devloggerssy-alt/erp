import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { OpeningBalanceSessionLine } from '@devloggers/db-prisma';
import { OpeningSessionPostedPolicy } from '../../posting';
import type { JournalLineDraft, OpeningSessionLineDraft, OpeningSessionPostedIntent } from '../../posting';
import { OpeningBalanceSessionsRepository } from './opening-balance-sessions.repository';
import type {
    OpeningBalancePreviewCurrencyTotalDto,
    OpeningBalancePreviewLineDto,
    OpeningBalancePreviewPartyDto,
} from '../dto/opening-balance-session-preview.dto';
import { OpeningBalanceSessionPreviewDto } from '../dto/opening-balance-session-preview.dto';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

type PreviewMaps = {
    accountCodes: Map<string, string>;
    partyNames: Map<string, string>;
    currencyCodes: Map<string, string>;
};

/**
 * Read-only dry-run of the opening-session posting policy (Phase 10.2.2).
 * `post()` and this service call the same `buildLines`, so a session that cannot
 * be resolved here cannot be posted either — the preview is the preflight. The
 * party section groups by (party, side, currency) and reads the currently posted
 * balance for that exact account + currency, never summing currencies together
 * (ADR-5).
 */
@Injectable()
export class OpeningBalanceSessionPreviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly repo: OpeningBalanceSessionsRepository,
        private readonly policy: OpeningSessionPostedPolicy,
    ) {}

    async preview(tenantId: string, id: string): Promise<OpeningBalanceSessionPreviewDto> {
        const session = await this.repo.findWithLines(tenantId, id);
        if (!session) throw new NotFoundException('Opening balance session not found');

        const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
            where: { id: session.fiscalPeriodId, tenantId },
            select: { startDate: true, status: true },
        });
        if (!fiscalPeriod) throw new BadRequestException('Fiscal period not found');

        const intent: OpeningSessionPostedIntent = {
            kind: 'OPENING_SESSION_POSTED',
            tenantId,
            userId: session.createdBy,
            date: fiscalPeriod.startDate,
            fiscalPeriodId: session.fiscalPeriodId,
            fiscalPeriodStatus: fiscalPeriod.status,
            exchangeRate: 1,
            referenceId: session.id,
            description: `Opening balances - ${session.number}`,
            lines: session.lines.map((line) => this.toLineDraft(line)),
        };

        const drafts = await this.policy.buildLines(this.prisma, intent);
        const lineDrafts = drafts.slice(0, intent.lines.length);
        const offsetDraft = drafts.length > intent.lines.length ? drafts[drafts.length - 1] ?? null : null;

        const maps = await this.loadMaps(tenantId, lineDrafts, offsetDraft);

        return {
            sessionId: session.id,
            number: session.number,
            status: session.status,
            currencyTotals: this.sumPerCurrency(lineDrafts, maps),
            offset: offsetDraft
                ? {
                    accountId: offsetDraft.accountId,
                    accountCode: maps.accountCodes.get(offsetDraft.accountId) ?? '',
                    amount: round(offsetDraft.debit > 0 ? offsetDraft.debit : offsetDraft.credit),
                }
                : null,
            lines: lineDrafts.map((draft, index) => this.toLineDto(draft, session.lines[index] ?? null, maps)),
            parties: await this.buildPartyRows(tenantId, lineDrafts, session.lines, maps),
        };
    }

    private toLineDraft(line: OpeningBalanceSessionLine): OpeningSessionLineDraft {
        return {
            dimension: line.dimension,
            accountId: line.accountId,
            partyId: line.partyId,
            cashboxId: line.cashboxId,
            bankAccountId: line.bankAccountId,
            currencyId: line.currencyId,
            partySide: line.partySide,
            amount: Number(line.amount),
            exchangeRate: Number(line.exchangeRate),
        };
    }

    private async loadMaps(
        tenantId: string,
        drafts: JournalLineDraft[],
        offset: JournalLineDraft | null,
    ): Promise<PreviewMaps> {
        const accountIds = this.distinct([...drafts.map((draft) => draft.accountId), ...(offset ? [offset.accountId] : [])]);
        const partyIds = this.distinct(drafts.map((draft) => draft.partyId));
        const currencyIds = this.distinct(drafts.map((draft) => draft.currencyId));

        const [accounts, parties, currencies] = await Promise.all([
            accountIds.length
                ? this.prisma.chartOfAccount.findMany({
                    where: { tenantId, id: { in: accountIds } },
                    select: { id: true, code: true },
                })
                : Promise.resolve([]),
            partyIds.length
                ? this.prisma.party.findMany({
                    where: { tenantId, id: { in: partyIds } },
                    select: { id: true, name: true },
                })
                : Promise.resolve([]),
            currencyIds.length
                ? this.prisma.currency.findMany({
                    where: { tenantId, id: { in: currencyIds } },
                    select: { id: true, code: true },
                })
                : Promise.resolve([]),
        ]);

        return {
            accountCodes: new Map(accounts.map((account) => [account.id, account.code])),
            partyNames: new Map(parties.map((party) => [party.id, party.name])),
            currencyCodes: new Map(currencies.map((currency) => [currency.id, currency.code])),
        };
    }

    private sumPerCurrency(drafts: JournalLineDraft[], maps: PreviewMaps): OpeningBalancePreviewCurrencyTotalDto[] {
        const totals = new Map<string | null, OpeningBalancePreviewCurrencyTotalDto>();

        for (const draft of drafts) {
            const currencyId = draft.currencyId ?? null;
            const bucket = totals.get(currencyId) ?? {
                currencyId,
                currencyCode: currencyId ? maps.currencyCodes.get(currencyId) ?? null : null,
                debit: 0,
                credit: 0,
                net: 0,
            };
            bucket.debit = round(bucket.debit + draft.debit);
            bucket.credit = round(bucket.credit + draft.credit);
            bucket.net = round(bucket.debit - bucket.credit);
            totals.set(currencyId, bucket);
        }

        return [...totals.values()];
    }

    private toLineDto(
        draft: JournalLineDraft,
        source: OpeningBalanceSessionLine | null,
        maps: PreviewMaps,
    ): OpeningBalancePreviewLineDto {
        return {
            dimension: source?.dimension ?? 'ACCOUNT',
            accountId: draft.accountId,
            accountCode: maps.accountCodes.get(draft.accountId) ?? '',
            partyId: draft.partyId ?? null,
            partyName: draft.partyId ? maps.partyNames.get(draft.partyId) ?? null : null,
            cashboxId: draft.cashboxId ?? null,
            bankAccountId: draft.bankAccountId ?? null,
            currencyId: draft.currencyId ?? null,
            currencyCode: draft.currencyId ? maps.currencyCodes.get(draft.currencyId) ?? null : null,
            amount: source ? Number(source.amount) : draft.amount ?? 0,
            exchangeRate: source ? Number(source.exchangeRate) : draft.exchangeRate ?? 1,
            debit: draft.debit,
            credit: draft.credit,
        };
    }

    private async buildPartyRows(
        tenantId: string,
        drafts: JournalLineDraft[],
        sources: OpeningBalanceSessionLine[],
        maps: PreviewMaps,
    ): Promise<OpeningBalancePreviewPartyDto[]> {
        const grouped = new Map<
            string,
            { partyId: string; side: 'AR' | 'AP'; accountId: string; currencyId: string; openingNet: number }
        >();

        drafts.forEach((draft, index) => {
            const source = sources[index];
            if (!source || source.dimension !== 'PARTY') return;
            if (!source.partyId || !source.partySide || !draft.currencyId) return;

            const key = `${source.partyId}:${source.partySide}:${draft.currencyId}`;
            const openingNet = round(draft.debit - draft.credit);
            const existing = grouped.get(key);
            if (existing) {
                existing.openingNet = round(existing.openingNet + openingNet);
            } else {
                grouped.set(key, {
                    partyId: source.partyId,
                    side: source.partySide,
                    accountId: draft.accountId,
                    currencyId: draft.currencyId,
                    openingNet,
                });
            }
        });

        if (grouped.size === 0) return [];

        const partyIds = [...new Set([...grouped.values()].map((group) => group.partyId))];
        const posted = await this.prisma.journalLine.groupBy({
            by: ['accountId', 'partyId', 'currencyId'],
            where: { tenantId, partyId: { in: partyIds }, journalEntry: { status: 'POSTED' } },
            _sum: { debit: true, credit: true },
        });
        const currentByKey = new Map<string, number>(
            posted.map((row) => [
                `${row.accountId}:${String(row.partyId)}:${String(row.currencyId)}`,
                round(Number(row._sum.debit ?? 0) - Number(row._sum.credit ?? 0)),
            ]),
        );

        return [...grouped.values()].map((group) => {
            const currentBalance = currentByKey.get(`${group.accountId}:${group.partyId}:${group.currencyId}`) ?? 0;
            return {
                partyId: group.partyId,
                partyName: maps.partyNames.get(group.partyId) ?? '',
                side: group.side,
                accountId: group.accountId,
                accountCode: maps.accountCodes.get(group.accountId) ?? '',
                currencyId: group.currencyId,
                currencyCode: maps.currencyCodes.get(group.currencyId) ?? '',
                openingNet: group.openingNet,
                currentBalance,
                resultingBalance: round(currentBalance + group.openingNet),
            };
        });
    }

    private distinct(values: Array<string | null | undefined>): string[] {
        return [...new Set(values.filter((value): value is string => Boolean(value)))];
    }
}
