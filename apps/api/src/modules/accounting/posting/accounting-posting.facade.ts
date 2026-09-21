import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { AuditWriter } from '../../audit';
import { OutboxRepository } from '../../../outbox/outbox.repository';
import { OUTBOX_TOPICS } from '../../../outbox/outbox.types';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** JSON-safe copy for the outbox payload — dates become ISO strings. */
function toJsonPayload(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value)) as unknown;
}

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. A rejection never
 * burns a document-sequence number.
 *
 * Phase 7.2.1 — every posted/reversed entry writes its AuditLog row through
 * the same transaction client, so an entry can never commit un-audited.
 *
 * Phase 8.4.2 — dual-write outbox seam. When OUTBOX_ENABLED=true the same
 * transaction also records a durable outbox event; callers and GL
 * consistency are unchanged. Default off (Phase 8.4.4).
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly audit: AuditWriter,
        private readonly outbox: OutboxRepository,
        private readonly config: ConfigService,
    ) {}

    async record(tx: PrismaTransactionClient, intent: PostingRecordIntent): Promise<{ journalEntryId: string }> {
        const result = await this.executeRecord(tx, intent);
        await this.publish(tx, intent.tenantId, OUTBOX_TOPICS.journalPosted, {
            journalEntryId: result.journalEntryId,
            number: result.number,
            intentKind: intent.kind,
            intent: toJsonPayload(intent),
        });
        return { journalEntryId: result.journalEntryId };
    }

    /** Reversal always mirrors the original entry — JournalPostingService.reverse does the mirroring. */
    async reverse(tx: PrismaTransactionClient, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }> {
        const result = await this.executeReverse(tx, intent);
        await this.publish(tx, intent.tenantId, OUTBOX_TOPICS.journalReversed, {
            journalEntryId: result.journalEntryId,
            number: result.number,
            intentKind: intent.kind,
            reversalOfId: intent.originalEntryId,
            intent: toJsonPayload(intent),
        });
        return { journalEntryId: result.journalEntryId };
    }

    private async executeRecord(
        tx: PrismaTransactionClient,
        intent: PostingRecordIntent,
    ): Promise<{ journalEntryId: string; number: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType, buildLines } = this.registry.resolvePosting(intent);
        const lines = await buildLines(tx);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.post(tx, {
            tenantId: intent.tenantId,
            number,
            date: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            lines,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_POST',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                date: intent.date,
                fiscalPeriodId: intent.fiscalPeriodId,
                lineCount: lines.length,
                totalDebit: round(lines.reduce((sum, line) => sum + Number(line.debit), 0)),
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id, number };
    }

    private async executeReverse(
        tx: PrismaTransactionClient,
        intent: PostingCancellationIntent,
    ): Promise<{ journalEntryId: string; number: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType } = this.registry.resolveReversal(intent);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.reverse(tx, {
            tenantId: intent.tenantId,
            number,
            originalEntryId: intent.originalEntryId,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            reversalDate: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_REVERSE',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                reversalOfId: intent.originalEntryId,
                date: intent.date,
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id, number };
    }

    private async publish(
        tx: PrismaTransactionClient,
        tenantId: string,
        topic: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        if (this.config.get<string>('OUTBOX_ENABLED') !== 'true') return;
        await this.outbox.enqueue(tx, { tenantId, topic, payload });
    }
}
