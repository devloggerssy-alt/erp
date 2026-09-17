import { Injectable } from '@nestjs/common';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { AuditWriter } from '../../audit/audit-writer.service';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — see this plan's "Deviations from the phase spec"
 * section, point 2 — is: period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. That order means a
 * rejection never burns a document-sequence number, matching every one of
 * the ten pre-Phase-1 call sites.
 *
 * Phase 7.2.1 — every posted/reversed entry writes its AuditLog row through
 * the same transaction client, so an entry can never commit un-audited.
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly audit: AuditWriter,
    ) {}

    async record(tx: PrismaTransactionClient, intent: PostingRecordIntent): Promise<{ journalEntryId: string }> {
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

        return { journalEntryId: entry.id };
    }

    /** Reversal always mirrors the original entry — JournalPostingService.reverse does the mirroring. */
    async reverse(tx: PrismaTransactionClient, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }> {
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

        return { journalEntryId: entry.id };
    }
}
