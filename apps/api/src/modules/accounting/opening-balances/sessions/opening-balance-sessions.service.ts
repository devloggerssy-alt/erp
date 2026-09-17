import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { OpeningBalanceSession, OpeningBalanceSessionLine } from '@devloggers/db-prisma';
import { DocumentSequencesService } from '../../document-sequences/services/document-sequences.service';
import {
    AccountingPostingFacade,
    type OpeningSessionPostedIntent,
    type OpeningSessionLineDraft,
} from '../../posting';
import { OpeningCashService } from '../services/opening-cash.service';
import { OpeningBankService } from '../services/opening-bank.service';
import { AuditWriter } from '../../../audit/audit-writer.service';
import { OpeningBalanceSessionsRepository } from './opening-balance-sessions.repository';
import { OpeningBalanceSessionsPresenter } from './opening-balance-sessions.presenter';
import {
    CreateOpeningBalanceSessionDto,
    UpdateOpeningBalanceSessionDto,
    OpeningBalanceSessionResponseDto,
    OpeningBalanceSessionLineDto,
} from '../dto/opening-balance-session.dto';

const MUTABLE_STATUSES = ['DRAFT'] as const;

/**
 * Opening-balance session workflow (ADR-3/4/5): draft → validate → review → post → lock.
 * Deliberately standalone (like OpeningBalancesService) — sessions are a workflow
 * resource with a strict lifecycle, not a plain CRUD collection. Posting goes through
 * AccountingPostingFacade; cash/bank projections are synced inside the same transaction.
 */
@Injectable()
export class OpeningBalanceSessionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly repo: OpeningBalanceSessionsRepository,
        private readonly presenter: OpeningBalanceSessionsPresenter,
        private readonly docSeqService: DocumentSequencesService,
        private readonly postingFacade: AccountingPostingFacade,
        private readonly openingCash: OpeningCashService,
        private readonly openingBank: OpeningBankService,
        private readonly audit: AuditWriter,
    ) {}

    async list(tenantId: string, options: { skip?: number; take?: number }): Promise<{
        data: OpeningBalanceSessionResponseDto[];
        total: number;
    }> {
        const result = await this.repo.findMany(tenantId, { skip: options.skip ?? 0, take: options.take ?? 100 });
        return { data: this.presenter.toResponseList(result.data as never), total: result.total };
    }

    async findById(tenantId: string, id: string): Promise<OpeningBalanceSessionResponseDto> {
        const entity = await this.repo.findWithLines(tenantId, id);
        if (!entity) throw new NotFoundException('Opening balance session not found');
        return this.presenter.toResponse(entity as never);
    }

    async createAs(
        tenantId: string,
        userId: string,
        dto: CreateOpeningBalanceSessionDto,
    ): Promise<OpeningBalanceSessionResponseDto> {
        this.assertLinesValid(dto.lines);
        const number = await this.docSeqService.getNextNumber(tenantId, 'OPENING_BALANCE');
        const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
            where: { id: dto.fiscalPeriodId, tenantId },
            select: { id: true },
        });
        if (!fiscalPeriod) throw new BadRequestException('Fiscal period not found');

        const created = await this.prisma.openingBalanceSession.create({
            data: {
                tenantId,
                number,
                fiscalPeriodId: dto.fiscalPeriodId,
                description: dto.description ?? null,
                createdBy: userId,
                lines: {
                    create: dto.lines.map((line) => ({ ...this.lineData(line), tenantId })),
                },
            },
        });

        return this.findById(tenantId, created.id);
    }

    async update(
        tenantId: string,
        id: string,
        dto: UpdateOpeningBalanceSessionDto,
    ): Promise<OpeningBalanceSessionResponseDto> {
        const existing = await this.findEntity(tenantId, id);
        this.assertMutable(existing.status);
        if (dto.lines) this.assertLinesValid(dto.lines);

        await this.prisma.$transaction(async (tx) => {
            await tx.openingBalanceSession.update({
                where: { id },
                data: { description: dto.description ?? existing.description },
            });
            if (dto.lines) {
                await tx.openingBalanceSessionLine.deleteMany({ where: { sessionId: id } });
                await tx.openingBalanceSessionLine.createMany({
                    data: dto.lines.map((line) => ({ ...this.lineData(line), tenantId, sessionId: id })),
                });
            }
        });

        return this.findById(tenantId, id);
    }

    async remove(tenantId: string, id: string): Promise<void> {
        const existing = await this.findEntity(tenantId, id);
        this.assertMutable(existing.status);
        await this.prisma.openingBalanceSession.delete({ where: { id } });
    }

    async validate(tenantId: string, id: string): Promise<OpeningBalanceSessionResponseDto> {
        const session = await this.getForTransition(tenantId, id, 'DRAFT', 'validate');
        if (session.lines.length === 0) {
            throw new BadRequestException('Cannot validate a session with no lines');
        }
        await this.prisma.openingBalanceSession.update({ where: { id }, data: { status: 'VALIDATED' } });
        return this.findById(tenantId, id);
    }

    async review(tenantId: string, id: string): Promise<OpeningBalanceSessionResponseDto> {
        await this.getForTransition(tenantId, id, 'VALIDATED', 'review');
        await this.prisma.openingBalanceSession.update({ where: { id }, data: { status: 'REVIEWED' } });
        return this.findById(tenantId, id);
    }

    async post(tenantId: string, id: string, userId: string): Promise<OpeningBalanceSessionResponseDto> {
        const session = await this.getForTransition(tenantId, id, 'REVIEWED', 'post');
        const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
            where: { id: session.fiscalPeriodId, tenantId },
            select: { startDate: true, status: true },
        });
        if (!fiscalPeriod) throw new BadRequestException('Fiscal period not found');

        const intent: OpeningSessionPostedIntent = {
            kind: 'OPENING_SESSION_POSTED',
            tenantId,
            userId,
            date: fiscalPeriod.startDate,
            fiscalPeriodId: session.fiscalPeriodId,
            fiscalPeriodStatus: fiscalPeriod.status,
            exchangeRate: 1,
            referenceId: session.id,
            description: `Opening balances - ${session.number}`,
            lines: session.lines.map((line) => this.lineDraftFromEntity(line)),
        };

        await this.prisma.$transaction(async (tx) => {
            await this.postingFacade.record(tx, intent);
            for (const line of session.lines) {
                if (line.dimension === 'CASHBOX' && line.cashboxId) {
                    await this.openingCash.syncProjection(tx, line.cashboxId, Number(line.amount));
                } else if (line.dimension === 'BANK_ACCOUNT' && line.bankAccountId) {
                    await this.openingBank.syncProjection(tx, line.bankAccountId, Number(line.amount));
                }
            }
            await tx.openingBalanceSession.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            });
            await this.audit.recordInTx(tx, {
                tenantId,
                userId,
                action: 'OPENING_SESSION_POST',
                entityType: 'opening_balance_session',
                entityId: id,
                source: 'GL',
                oldValues: { status: 'REVIEWED' },
                newValues: { status: 'POSTED', number: session.number, lineCount: session.lines.length },
            });
        });

        return this.findById(tenantId, id);
    }

    async lock(tenantId: string, id: string, userId: string): Promise<OpeningBalanceSessionResponseDto> {
        await this.getForTransition(tenantId, id, 'POSTED', 'lock');
        await this.prisma.$transaction(async (tx) => {
            await tx.openingBalanceSession.update({
                where: { id },
                data: { status: 'LOCKED', lockedAt: new Date(), lockedBy: userId },
            });
            await this.audit.recordInTx(tx, {
                tenantId,
                userId,
                action: 'OPENING_SESSION_LOCK',
                entityType: 'opening_balance_session',
                entityId: id,
                source: 'GL',
                oldValues: { status: 'POSTED' },
                newValues: { status: 'LOCKED' },
            });
        });
        return this.findById(tenantId, id);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private lineData(line: OpeningBalanceSessionLineDto) {
        return {
            dimension: line.dimension,
            accountId: line.accountId ?? null,
            partyId: line.partyId ?? null,
            cashboxId: line.cashboxId ?? null,
            bankAccountId: line.bankAccountId ?? null,
            currencyId: line.currencyId ?? null,
            partySide: line.partySide ?? null,
            amount: line.amount,
            exchangeRate: line.exchangeRate ?? 1,
        };
    }

    private lineDraftFromEntity(line: OpeningBalanceSessionLine): OpeningSessionLineDraft {
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

    private assertLinesValid(lines: OpeningBalanceSessionLineDto[]): void {
        if (lines.length === 0) throw new BadRequestException('At least one line is required');
        for (const line of lines) {
            if (line.dimension === 'ACCOUNT' && !line.accountId) {
                throw new BadRequestException('ACCOUNT line requires accountId');
            }
            if (line.dimension === 'CASHBOX' && !line.cashboxId) {
                throw new BadRequestException('CASHBOX line requires cashboxId');
            }
            if (line.dimension === 'BANK_ACCOUNT' && !line.bankAccountId) {
                throw new BadRequestException('BANK_ACCOUNT line requires bankAccountId');
            }
            if (line.dimension === 'PARTY') {
                if (!line.partyId) throw new BadRequestException('PARTY line requires partyId');
                if (!line.partySide) throw new BadRequestException('PARTY line requires partySide (AR or AP)');
            }
            if (['CASHBOX', 'BANK_ACCOUNT', 'PARTY'].includes(line.dimension) && !line.currencyId) {
                throw new BadRequestException(`${line.dimension} line requires currencyId`);
            }
        }
    }

    private assertMutable(status: string): void {
        if (!MUTABLE_STATUSES.includes(status as never)) {
            throw new BadRequestException(`Cannot modify a session in ${status} status. Only DRAFT sessions can be modified.`);
        }
    }

    private async findEntity(tenantId: string, id: string): Promise<OpeningBalanceSession> {
        const entity = await this.repo.findById(tenantId, id);
        if (!entity) throw new NotFoundException('Opening balance session not found');
        return entity;
    }

    private async getForTransition(
        tenantId: string,
        id: string,
        expected: string,
        action: string,
    ): Promise<OpeningBalanceSession & { lines: OpeningBalanceSessionLine[] }> {
        const session = await this.prisma.openingBalanceSession.findFirst({
            where: { id, tenantId },
            include: { lines: { orderBy: { createdAt: 'asc' } } },
        });
        if (!session) throw new NotFoundException('Opening balance session not found');
        if (session.status !== expected) {
            throw new BadRequestException(`Cannot ${action} a session in ${session.status} status. Expected ${expected}.`);
        }
        return session;
    }
}