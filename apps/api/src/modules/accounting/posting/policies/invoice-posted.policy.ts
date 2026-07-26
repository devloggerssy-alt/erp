import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { InvoicePostedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Builds balanced double-entry lines for an invoice, absorbing what used to
 * live at the top of InvoicePostingService.postPurchaseInvoice/postSalesInvoice
 * (account resolution) plus invoice-journal.ts and inventory-journal.ts's
 * buildCogsJournalLines (the math). See docs/superpowers/specs/2026-07-25-architecture-refactor/00-findings.md#f1.
 */
@Injectable()
export class InvoicePostedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: InvoicePostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const party = await tx.party.findFirst({
            where: { id: intent.partyId, tenantId: intent.tenantId },
            select: { receivableAccountId: true, payableAccountId: true },
        });

        const rate = intent.exchangeRate;
        const totalBase = round(intent.total * rate);
        const netBase = round(intent.netAmount * rate);
        const taxBase = round(intent.taxAmount * rate);

        if (intent.direction === 'SALE') {
            const receivableAccountId = party?.receivableAccountId ?? settings.defaultReceivableAccountId;
            if (!receivableAccountId) {
                throw new BadRequestException(
                    'No Accounts Receivable account configured. Set a default in Financial Settings or on the party.',
                );
            }
            if (!settings.defaultSalesAccountId) {
                throw new BadRequestException('No default Sales account configured in Financial Settings.');
            }

            const lines: JournalLineDraft[] = [
                { accountId: receivableAccountId, debit: totalBase, credit: 0, description: null, sortOrder: 0, partyId: intent.partyId },
                { accountId: settings.defaultSalesAccountId, debit: 0, credit: netBase, description: null, sortOrder: 1 },
            ];
            if (taxBase > 0 && settings.defaultTaxAccountId) {
                lines.push({ accountId: settings.defaultTaxAccountId, debit: 0, credit: taxBase, description: null, sortOrder: 2 });
            }
            if (intent.cogsTotal && intent.cogsTotal > 0) {
                if (!settings.defaultCogsAccountId || !settings.defaultInventoryAccountId) {
                    throw new BadRequestException('No default COGS / Inventory account configured in Financial Settings.');
                }
                const cogsBase = round(intent.cogsTotal);
                lines.push(
                    { accountId: settings.defaultCogsAccountId, debit: cogsBase, credit: 0, description: null, sortOrder: lines.length },
                    { accountId: settings.defaultInventoryAccountId, debit: 0, credit: cogsBase, description: null, sortOrder: lines.length + 1 },
                );
            }
            return lines;
        }

        // PURCHASE
        const payableAccountId = party?.payableAccountId ?? settings.defaultPayableAccountId;
        if (!payableAccountId) {
            throw new BadRequestException(
                'No Accounts Payable account configured. Set a default in Financial Settings or on the party.',
            );
        }
        if (!settings.defaultPurchaseAccountId) {
            throw new BadRequestException('No default Purchase account configured in Financial Settings.');
        }

        const invBase = round((intent.inventoryAmount ?? 0) * rate);
        const expenseBase = round(netBase - invBase);
        const lines: JournalLineDraft[] = [];

        if (invBase > 0) {
            if (!settings.defaultInventoryAccountId) {
                throw new BadRequestException('No default Inventory account configured in Financial Settings.');
            }
            lines.push({ accountId: settings.defaultInventoryAccountId, debit: invBase, credit: 0, description: null, sortOrder: lines.length });
        }
        if (expenseBase > 0) {
            lines.push({ accountId: settings.defaultPurchaseAccountId, debit: expenseBase, credit: 0, description: null, sortOrder: lines.length });
        }
        if (taxBase > 0 && settings.defaultTaxAccountId) {
            lines.push({ accountId: settings.defaultTaxAccountId, debit: taxBase, credit: 0, description: null, sortOrder: lines.length });
        }
        lines.push({ accountId: payableAccountId, debit: 0, credit: totalBase, description: null, sortOrder: lines.length, partyId: intent.partyId });
        return lines;
    }
}
