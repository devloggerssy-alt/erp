import { Injectable } from '@nestjs/common';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — see this plan's "Deviations from the phase spec"
 * section, point 2 — is: period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. That order means a
 * rejection never burns a document-sequence number, matching every one of
 * the ten pre-Phase-1 call sites.
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
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
        return { journalEntryId: entry.id };
    }
}
